import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Clipboard,
  FlatList,
  Image,
  Modal,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { useMessages } from "@/hooks/useMessages";
import { useAllSessions } from "@/hooks/useSessions";
import { useModels } from "@/hooks/useModels";
import { Methods } from "@/lib/api/protocol";
import { useAgents } from "@/hooks/useAgents";
import { useCreateAgent } from "@/hooks/useCreateAgent";
import * as Haptics from "expo-haptics";

interface AttachedImage {
  uri: string;
  name: string;
  mimeType: string;
}

interface MsgBubbleProps {
  role: "user" | "assistant" | "tool";
  content: string;
  isStreaming?: boolean;
  toolName?: string;
  colors: ReturnType<typeof useColors>;
}

function copyToClipboard(text: string) {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  Clipboard.setString(text);
}

function renderInlineMarkdown(text: string, colors: ReturnType<typeof useColors>, key: number) {
  // Split by bold (**), italic (*), and inline code (`)
  const tokenRegex = /(\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`)/g;
  const nodes: React.ReactNode[] = [];
  let last = 0;
  let m;
  let idx = 0;
  while ((m = tokenRegex.exec(text)) !== null) {
    if (m.index > last) {
      nodes.push(<Text key={`t${key}${idx++}`} style={[styles.bubbleText, { color: colors.foreground }]}>{text.slice(last, m.index)}</Text>);
    }
    if (m[2]) {
      nodes.push(<Text key={`t${key}${idx++}`} style={[styles.bubbleText, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>{m[2]}</Text>);
    } else if (m[3]) {
      nodes.push(<Text key={`t${key}${idx++}`} style={[styles.bubbleText, { color: colors.foreground, fontStyle: "italic" }]}>{m[3]}</Text>);
    } else if (m[4]) {
      nodes.push(<Text key={`t${key}${idx++}`} style={[styles.inlineCode, { backgroundColor: "#1e293b", color: "#e2e8f0" }]}>{m[4]}</Text>);
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) {
    nodes.push(<Text key={`t${key}${idx++}`} style={[styles.bubbleText, { color: colors.foreground }]}>{text.slice(last)}</Text>);
  }
  return nodes.length > 0 ? nodes : [<Text key={`t${key}0`} style={[styles.bubbleText, { color: colors.foreground }]}>{text}</Text>];
}

function renderContent(content: string, colors: ReturnType<typeof useColors>) {
  const parts: Array<{ type: "text" | "code"; text: string; lang?: string }> = [];
  const codeRegex = /```(\w*)\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;
  while ((match = codeRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", text: content.slice(lastIndex, match.index) });
    }
    parts.push({ type: "code", lang: match[1] || "code", text: match[2].trim() });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < content.length) {
    parts.push({ type: "text", text: content.slice(lastIndex) });
  }
  if (parts.length === 0) parts.push({ type: "text", text: content });

  return parts.map((p, i) => {
    if (p.type === "code") {
      return (
        <View key={i} style={[styles.codeBlock, { backgroundColor: "#0f172a", borderColor: "#1e293b" }]}>
          <View style={styles.codeHeader}>
            <Ionicons name="code-slash-outline" size={11} color="#64748b" />
            <Text style={styles.codeLang}>{p.lang}</Text>
          </View>
          <Text style={styles.codeText}>{p.text}</Text>
        </View>
      );
    }
    // Split text by lines to detect heading/list prefixes
    const lines = p.text.split("\n");
    return (
      <View key={i} style={styles.textBlock}>
        {lines.map((line, li) => {
          // Heading (# ## ###)
          const h1 = line.match(/^# (.+)/);
          const h2 = line.match(/^## (.+)/);
          const h3 = line.match(/^### (.+)/);
          if (h1) return <Text key={li} style={[styles.mdH1, { color: colors.foreground }]}>{h1[1]}</Text>;
          if (h2) return <Text key={li} style={[styles.mdH2, { color: colors.foreground }]}>{h2[1]}</Text>;
          if (h3) return <Text key={li} style={[styles.mdH3, { color: colors.foreground }]}>{h3[1]}</Text>;
          // List item (- or *)
          const listItem = line.match(/^[-*] (.+)/);
          if (listItem) return (
            <View key={li} style={styles.listItem}>
              <View style={[styles.listDot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.bubbleText, { color: colors.foreground, flex: 1 }]}>{listItem[1]}</Text>
            </View>
          );
          // Numbered list
          const numItem = line.match(/^(\d+)\. (.+)/);
          if (numItem) return (
            <View key={li} style={styles.listItem}>
              <Text style={[styles.numLabel, { color: colors.primary }]}>{numItem[1]}.</Text>
              <Text style={[styles.bubbleText, { color: colors.foreground, flex: 1 }]}>{numItem[2]}</Text>
            </View>
          );
          // Empty line → spacing
          if (line.trim() === "") return <View key={li} style={{ height: 4 }} />;
          // Normal line with inline markdown
          return (
            <Text key={li} style={styles.lineWrap}>
              {renderInlineMarkdown(line, colors, li * 1000 + i)}
            </Text>
          );
        })}
      </View>
    );
  });
}

function MsgBubble({ role, content, isStreaming, toolName, colors }: MsgBubbleProps) {
  const isUser = role === "user";
  const hasCode = !isUser && content.includes("```");

  if (isStreaming && !content) {
    return (
      <View style={styles.bubbleWrap}>
        <View style={[styles.agentAvatar, { backgroundColor: colors.primary + "20" }]}>
          <Ionicons name="sparkles" size={13} color={colors.primary} />
        </View>
        <View style={styles.bubbleContent}>
          {toolName && (
            <View style={[styles.toolBadge, { backgroundColor: "#3b82f615", borderColor: "#3b82f630" }]}>
              <Ionicons name="settings-outline" size={12} color="#60a5fa" />
              <Text style={styles.toolBadgeText}>{toolName}</Text>
              <ActivityIndicator size="small" color="#60a5fa" style={{ marginLeft: 4 }} />
            </View>
          )}
          <View style={[styles.bubble, styles.assistantBubble, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.thinkingDots}>
              <View style={[styles.dot, { backgroundColor: colors.primary }]} />
              <View style={[styles.dot, { backgroundColor: colors.primary }]} />
              <View style={[styles.dot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.thinkingText, { color: colors.mutedForeground }]}>Đang xử lý...</Text>
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.bubbleWrap, isUser ? styles.userWrap : styles.assistantWrap]}>
      {!isUser && (
        <View style={[styles.agentAvatar, { backgroundColor: colors.primary + "20" }]}>
          <Ionicons name="sparkles" size={13} color={colors.primary} />
        </View>
      )}
      <View style={[styles.bubbleContent, isUser && styles.userBubbleContent]}>
        {role === "tool" && toolName && (
          <View style={[styles.toolBadge, { backgroundColor: "#3b82f615", borderColor: "#3b82f630" }]}>
            <Ionicons name="settings-outline" size={12} color="#60a5fa" />
            <Text style={styles.toolBadgeText}>{toolName}</Text>
          </View>
        )}
        <View
          style={[
            styles.bubble,
            isUser
              ? [styles.userBubble, { backgroundColor: "#7c3400" }]
              : [styles.assistantBubble, { backgroundColor: colors.card, borderColor: colors.border }],
            hasCode && styles.bubbleWide,
          ]}
        >
          {isStreaming && content ? (
            <>
              {renderContent(content, colors)}
              <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 4 }} />
            </>
          ) : (
            renderContent(content, colors)
          )}
        </View>
        <View style={[styles.bubbleFooter, isUser && { justifyContent: "flex-end" }]}>
          <Text style={[styles.bubbleTime, { color: colors.mutedForeground }]}>
            {new Date().toLocaleTimeString("vi", { hour: "2-digit", minute: "2-digit" })}
            {isUser ? " ✓✓" : ""}
          </Text>
          {!isUser && !isStreaming && content && (
            <TouchableOpacity
              onPress={() => copyToClipboard(content)}
              style={styles.copyBtn}
              activeOpacity={0.6}
            >
              <Ionicons name="copy-outline" size={12} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { connected, ws } = useAuth();
  const { sessions } = useAllSessions();
  const [text, setText] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showRename, setShowRename] = useState(false);
  const [renameText, setRenameText] = useState("");
  const [renameLabel, setRenameLabel] = useState<string>("");
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [pickerProvider, setPickerProvider] = useState<string>("");
  const [attachments, setAttachments] = useState<AttachedImage[]>([]);

  const { models: allModels } = useModels();
  const { agents } = useAgents();
  const { updateAgent, saving: savingModel } = useCreateAgent();

  const providers = Array.from(new Set(allModels.map((m) => m.provider))).filter(Boolean);
  const inputRef = useRef<TextInput>(null);

  const handlePickImage = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Cần quyền truy cập", "Cho phép truy cập ảnh để đính kèm");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.85,
      allowsMultipleSelection: true,
      selectionLimit: 4,
    });
    if (!result.canceled) {
      const picked: AttachedImage[] = result.assets.map((a) => ({
        uri: a.uri,
        name: a.fileName ?? `image_${Date.now()}.jpg`,
        mimeType: a.mimeType ?? "image/jpeg",
      }));
      setAttachments((prev) => [...prev, ...picked].slice(0, 4));
    }
  }, []);

  const handlePickCamera = useCallback(async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Cần quyền camera", "Cho phép truy cập camera để chụp ảnh");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.85 });
    if (!result.canceled && result.assets[0]) {
      const a = result.assets[0];
      setAttachments((prev) => [...prev, { uri: a.uri, name: a.fileName ?? `photo_${Date.now()}.jpg`, mimeType: a.mimeType ?? "image/jpeg" }].slice(0, 4));
    }
  }, []);

  const removeAttachment = (uri: string) => setAttachments((prev) => prev.filter((a) => a.uri !== uri));

  const sessionKey = id?.includes(":") ? id : undefined;
  const { messages: liveMessages, sending, isRunning, activity, send: sendLive } = useMessages(
    sessionKey ?? "",
  );

  const useLive = connected && !!sessionKey;

  const liveSession = sessions.find((s) => s.key === sessionKey);

  const rawDisplayMessages = liveMessages;
  const displayMessages = searchQuery.trim()
    ? rawDisplayMessages.filter((m) => typeof m.content === "string" && m.content.toLowerCase().includes(searchQuery.toLowerCase()))
    : rawDisplayMessages;

  const agentName = liveSession?.agentName ?? id?.split(":")[1] ?? "Agent";
  const model = liveSession?.model ?? "";

  const handleRenameOpen = useCallback(() => {
    setShowMenu(false);
    const current = renameLabel || agentName;
    setRenameText(current);
    setShowRename(true);
  }, [renameLabel, agentName]);

  const handleRenameConfirm = useCallback(async () => {
    if (!sessionKey || !ws) return;
    try {
      await ws.call(Methods.SESSIONS_PATCH, { key: sessionKey, label: renameText.trim() || null });
      setRenameLabel(renameText.trim());
    } catch {
      Alert.alert("Lỗi", "Không thể đổi tên session");
    } finally {
      setShowRename(false);
    }
  }, [sessionKey, ws, renameText]);

  const handleExport = useCallback(() => {
    setShowMenu(false);
    const msgs = displayMessages;
    if (!msgs.length) {
      Alert.alert("Không có tin nhắn", "Session này chưa có nội dung để xuất.");
      return;
    }
    const lines: string[] = [
      `# ${agentName}`,
      `Xuất: ${new Date().toLocaleString("vi")} · ${msgs.length} tin nhắn`,
      "",
      "---",
      "",
    ];
    msgs.forEach((m) => {
      const roleLabel = m.role === "user" ? "Bạn" : m.role === "assistant" ? agentName : "[Tool]";
      lines.push(`**${roleLabel}**: ${m.content}`);
      lines.push("");
    });
    Share.share({ message: lines.join("\n"), title: `GoClaw — ${agentName}` }).catch(() => {});
  }, [displayMessages, agentName]);

  const handleSend = useCallback(() => {
    if ((!text.trim() && attachments.length === 0) || !id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Build message: text + attachment references
    let msgText = text.trim();
    if (attachments.length > 0) {
      const refs = attachments.map((a) => `[Image: ${a.name}]`).join(" ");
      msgText = msgText ? `${msgText}\n${refs}` : refs;
    }
    if (sessionKey) {
      sendLive(msgText);
    }
    setText("");
    setAttachments([]);
  }, [text, attachments, id, sessionKey, sendLive]);

  const topPad = insets.top;
  const canSend = (text.trim().length > 0 || attachments.length > 0) && !sending && !isRunning;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior="padding"
      keyboardVerticalOffset={0}
    >
      <View
        style={[
          styles.header,
          { paddingTop: topPad + 4, backgroundColor: colors.background, borderBottomColor: colors.border },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </TouchableOpacity>

        <View style={[styles.agentAvatarLg, { backgroundColor: colors.primary + "20" }]}>
          <Text style={[styles.agentInitials, { color: colors.primary }]}>
            {agentName.slice(0, 2).toUpperCase()}
          </Text>
        </View>

        <View style={styles.agentInfo}>
          <View style={styles.agentNameRow}>
            <Text style={[styles.agentName, { color: colors.foreground }]}>{renameLabel || agentName}</Text>
            {isRunning && (
              <View style={[styles.runningDot, { backgroundColor: colors.primary }]} />
            )}
          </View>
          {model ? (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                const currentAgent = agents.find((a) => a.agent_key === agentName);
                setPickerProvider(currentAgent?.provider ?? "");
                setShowModelPicker(true);
              }}
            >
              <View style={[styles.modelBadge, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                <Text style={[styles.modelBadgeText, { color: colors.mutedForeground }]}>
                  {model} ▾
                </Text>
              </View>
            </TouchableOpacity>
          ) : activity ? (
            <Text style={[styles.activityText, { color: colors.primary }]} numberOfLines={1}>{activity}</Text>
          ) : null}
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: showSearch ? colors.primary + "22" : colors.secondary }]}
            activeOpacity={0.7}
            onPress={() => {
              setShowSearch((v) => {
                if (v) setSearchQuery("");
                return !v;
              });
            }}
          >
            <Ionicons name={showSearch ? "close" : "search-outline"} size={16} color={showSearch ? colors.primary : colors.mutedForeground} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: showMenu ? colors.primary + "22" : colors.secondary }]}
            activeOpacity={0.7}
            onPress={() => setShowMenu((v) => !v)}
          >
            <Ionicons name="ellipsis-horizontal" size={16} color={showMenu ? colors.primary : colors.mutedForeground} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Inline search bar */}
      {showSearch && (
        <View style={[styles.searchBar, { backgroundColor: colors.secondary, borderBottomColor: colors.border }]}>
          <Ionicons name="search-outline" size={15} color={colors.mutedForeground} />
          <TextInput
            autoFocus
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Tìm trong cuộc trò chuyện..."
            placeholderTextColor={colors.mutedForeground}
            style={[styles.searchInput, { color: colors.foreground }]}
          />
          {searchQuery.length > 0 && (
            <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginRight: 4 }}>
              {displayMessages.length} kết quả
            </Text>
          )}
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")} activeOpacity={0.7}>
              <Ionicons name="close-circle" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {showMenu && (
        <>
          <TouchableOpacity
            style={styles.menuBackdrop}
            activeOpacity={1}
            onPress={() => setShowMenu(false)}
          />
          <View style={[styles.menuDropdown, { backgroundColor: colors.card, borderColor: colors.border, top: topPad + 52 }]}>
            {connected && !!sessionKey && (
              <>
                <TouchableOpacity style={styles.menuItem} onPress={handleRenameOpen} activeOpacity={0.7}>
                  <Ionicons name="pencil-outline" size={16} color={colors.foreground} />
                  <Text style={[styles.menuItemText, { color: colors.foreground }]}>Đổi tên session</Text>
                </TouchableOpacity>
                <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />
              </>
            )}
            <TouchableOpacity style={styles.menuItem} onPress={handleExport} activeOpacity={0.7}>
              <Ionicons name="share-outline" size={16} color={colors.foreground} />
              <Text style={[styles.menuItemText, { color: colors.foreground }]}>Xuất cuộc trò chuyện</Text>
            </TouchableOpacity>
            <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />
            <TouchableOpacity style={styles.menuItem} activeOpacity={0.7} onPress={() => setShowMenu(false)}>
              <Ionicons name="information-circle-outline" size={16} color={colors.foreground} />
              <Text style={[styles.menuItemText, { color: colors.foreground }]}>Thông tin session</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Rename Session Modal */}
      <Modal visible={showRename} animationType="fade" transparent onRequestClose={() => setShowRename(false)}>
        <View style={styles.renameOverlay}>
          <View style={[styles.renameBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.renameTitle, { color: colors.foreground }]}>Đổi tên session</Text>
            <TextInput
              style={[styles.renameInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.secondary }]}
              value={renameText}
              onChangeText={setRenameText}
              placeholder="Nhập tên mới..."
              placeholderTextColor={colors.mutedForeground}
              autoFocus
              selectTextOnFocus
              returnKeyType="done"
              onSubmitEditing={handleRenameConfirm}
            />
            <View style={styles.renameActions}>
              <TouchableOpacity
                style={[styles.renameBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
                onPress={() => setShowRename(false)}
                activeOpacity={0.7}
              >
                <Text style={[styles.renameBtnText, { color: colors.mutedForeground }]}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.renameBtn, { backgroundColor: colors.primary }]}
                onPress={handleRenameConfirm}
                activeOpacity={0.7}
              >
                <Text style={[styles.renameBtnText, { color: "#fff" }]}>Lưu</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Model Picker Modal */}
      <Modal visible={showModelPicker} animationType="slide" transparent onRequestClose={() => setShowModelPicker(false)}>
        <View style={styles.modelModalOverlay}>
          <View style={[styles.modelModalBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modelModalHeader}>
              <View>
                <Text style={[styles.modelModalTitle, { color: colors.foreground }]}>Đổi Provider & Model</Text>
                <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginTop: 2 }}>
                  Agent: <Text style={{ color: colors.primary }}>{agentName}</Text>
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowModelPicker(false)}>
                <Ionicons name="close" size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            {/* Provider chips */}
            <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground, textTransform: "uppercase", letterSpacing: 0.5 }}>Provider</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
              <View style={{ flexDirection: "row", gap: 8, paddingVertical: 2 }}>
                {(providers.length > 0 ? providers : ["openai", "anthropic", "gemini", "groq", "ollama"]).map((p) => {
                  const active = pickerProvider === p;
                  return (
                    <TouchableOpacity
                      key={p}
                      onPress={() => setPickerProvider(p)}
                      style={[styles.providerChip, { backgroundColor: active ? colors.primary + "18" : colors.secondary, borderColor: active ? colors.primary : colors.border }]}
                      activeOpacity={0.7}
                    >
                      <Text style={{ fontSize: 12, fontFamily: "Inter_500Medium", color: active ? colors.primary : colors.mutedForeground }}>{p}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            {/* Model list */}
            <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground, textTransform: "uppercase", letterSpacing: 0.5 }}>Model</Text>
            <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
              {allModels.filter((m) => !pickerProvider || m.provider === pickerProvider).length === 0 ? (
                <View style={{ padding: 24, alignItems: "center", gap: 8 }}>
                  <Ionicons name="cloud-offline-outline" size={28} color={colors.mutedForeground} />
                  <Text style={{ fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_400Regular", textAlign: "center" }}>
                    {connected ? "Không có model nào" : "Kết nối server để xem danh sách model"}
                  </Text>
                </View>
              ) : (
                allModels
                  .filter((m) => !pickerProvider || m.provider === pickerProvider)
                  .map((m) => {
                    const active = model === m.name;
                    return (
                      <TouchableOpacity
                        key={m.name}
                        onPress={async () => {
                          const currentAgent = agents.find((a) => a.agent_key === agentName);
                          if (currentAgent) {
                            try {
                              await updateAgent(currentAgent.id, { model: m.name, provider: m.provider });
                            } catch {
                              Alert.alert("Lỗi", "Không thể đổi model");
                            }
                          }
                          setShowModelPicker(false);
                        }}
                        style={[styles.modelPickItem, { borderColor: active ? colors.primary + "50" : colors.border, backgroundColor: active ? colors.primary + "10" : "transparent" }]}
                        activeOpacity={0.7}
                        disabled={savingModel}
                      >
                        <View style={{ flex: 1, gap: 2 }}>
                          <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: active ? colors.primary : colors.foreground }}>
                            {m.display_name || m.name}
                          </Text>
                          <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: colors.mutedForeground }}>
                            {m.name}{m.context_window ? ` · ${(m.context_window / 1000).toFixed(0)}k ctx` : ""}{m.provider !== pickerProvider && ` · ${m.provider}`}
                          </Text>
                        </View>
                        {savingModel && active
                          ? <ActivityIndicator size="small" color={colors.primary} />
                          : active
                            ? <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                            : m.is_default
                              ? <View style={[styles.defaultBadge, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "30" }]}>
                                  <Text style={{ fontSize: 10, color: colors.primary, fontFamily: "Inter_600SemiBold" }}>default</Text>
                                </View>
                              : null}
                      </TouchableOpacity>
                    );
                  })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <FlatList
        data={[...displayMessages].reverse()}
        keyExtractor={(item) => ("id" in item ? (item as { id: string }).id : String(Math.random()))}
        renderItem={({ item }) => {
          const msg = item as { id: string; role: "user" | "assistant" | "tool"; content: string; isStreaming?: boolean; toolName?: string };
          return (
            <MsgBubble
              role={msg.role}
              content={msg.content}
              isStreaming={msg.isStreaming}
              toolName={msg.toolName}
              colors={colors}
            />
          );
        }}
        inverted
        contentContainerStyle={[styles.messageList, { paddingBottom: 16, paddingTop: insets.bottom + 80, flexGrow: 1 }]}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View style={styles.emptyChat}>
            <View style={[styles.emptyChatIcon, { backgroundColor: colors.primary + "18" }]}>
              <Ionicons name="chatbubble-ellipses-outline" size={32} color={colors.primary} />
            </View>
            <Text style={[styles.emptyChatTitle, { color: colors.foreground }]}>
              {agentName}
            </Text>
            <Text style={[styles.emptyChatSub, { color: colors.mutedForeground }]}>
              {connected ? "Nhập tin nhắn để bắt đầu cuộc trò chuyện" : "Kết nối server để bắt đầu chat"}
            </Text>
          </View>
        }
      />

      <View
        style={[
          styles.inputArea,
          { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: insets.bottom + 8 },
        ]}
      >
        <View style={styles.toolbar}>
          <TouchableOpacity
            style={[styles.toolbarBtn, { backgroundColor: attachments.length > 0 ? colors.primary + "20" : colors.secondary }]}
            onPress={handlePickImage}
            activeOpacity={0.7}
          >
            <Ionicons name="attach" size={16} color={attachments.length > 0 ? colors.primary : colors.mutedForeground} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.toolbarBtn, { backgroundColor: colors.secondary }]} activeOpacity={0.7}>
            <Ionicons name="mic-outline" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.toolbarBtn, { backgroundColor: colors.secondary }]} onPress={handlePickCamera} activeOpacity={0.7}>
            <Ionicons name="camera-outline" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
          <View style={styles.toolbarSpacer} />
          <Text style={[styles.contextText, { color: colors.mutedForeground }]}>context: 12% ▓░░░░</Text>
        </View>

        {/* Attachment preview strip */}
        {attachments.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.attachStrip} contentContainerStyle={styles.attachStripContent}>
            {attachments.map((a) => (
              <View key={a.uri} style={styles.attachThumbWrap}>
                <Image source={{ uri: a.uri }} style={styles.attachThumb} resizeMode="cover" />
                <TouchableOpacity style={styles.attachRemove} onPress={() => removeAttachment(a.uri)} activeOpacity={0.7}>
                  <Ionicons name="close-circle" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}

        <View style={styles.inputRow}>
          <TextInput
            ref={inputRef}
            style={[styles.input, { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.foreground }]}
            value={text}
            onChangeText={setText}
            placeholder="Nhập tin nhắn..."
            placeholderTextColor={colors.mutedForeground}
            multiline
            maxLength={4000}
            returnKeyType="default"
          />
          <TouchableOpacity
            style={[styles.sendBtn, { backgroundColor: canSend ? colors.primary : colors.secondary }]}
            onPress={handleSend}
            disabled={!canSend}
            activeOpacity={0.8}
          >
            {sending || isRunning ? (
              <ActivityIndicator size="small" color={colors.mutedForeground} />
            ) : (
              <Ionicons name="arrow-up" size={18} color={canSend ? "#fff" : colors.mutedForeground} />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  backBtn: { padding: 4 },
  agentAvatarLg: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  agentInitials: { fontSize: 13, fontFamily: "Inter_700Bold" },
  agentInfo: { flex: 1, gap: 3 },
  agentNameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  agentName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  runningDot: { width: 7, height: 7, borderRadius: 4 },
  modelBadge: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
  modelBadgeText: { fontSize: 10, fontFamily: "Inter_400Regular" },
  activityText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  headerActions: { flexDirection: "row", gap: 6 },
  iconBtn: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  messageList: { paddingHorizontal: 14 },
  bubbleWrap: { marginVertical: 5, flexDirection: "row", alignItems: "flex-end", gap: 8 },
  userWrap: { justifyContent: "flex-end" },
  assistantWrap: { justifyContent: "flex-start" },
  agentAvatar: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center", flexShrink: 0, marginBottom: 16 },
  bubbleContent: { maxWidth: "80%", gap: 3 },
  bubbleWide: { maxWidth: "100%" },
  userBubbleContent: { alignItems: "flex-end" },
  toolBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  toolBadgeText: { fontSize: 12, fontFamily: "Inter_500Medium", color: "#60a5fa" },
  bubble: { padding: 11, borderRadius: 18 },
  userBubble: { borderBottomRightRadius: 4 },
  assistantBubble: { borderBottomLeftRadius: 4, borderWidth: 1 },
  bubbleText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 21 },
  textBlock: { gap: 2 },
  lineWrap: { flexWrap: "wrap" },
  inlineCode: { fontSize: 12, fontFamily: "monospace", borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 },
  mdH1: { fontSize: 18, fontFamily: "Inter_700Bold", lineHeight: 26, marginVertical: 4 },
  mdH2: { fontSize: 16, fontFamily: "Inter_700Bold", lineHeight: 23, marginVertical: 3 },
  mdH3: { fontSize: 14, fontFamily: "Inter_600SemiBold", lineHeight: 21, marginVertical: 2 },
  listItem: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginVertical: 1 },
  listDot: { width: 5, height: 5, borderRadius: 3, marginTop: 8, flexShrink: 0 },
  numLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold", minWidth: 20 },
  bubbleFooter: { flexDirection: "row", alignItems: "center", gap: 6 },
  bubbleTime: { fontSize: 10, fontFamily: "Inter_400Regular" },
  timeRight: { textAlign: "right" },
  copyBtn: { padding: 2 },
  thinkingDots: { flexDirection: "row", alignItems: "center", gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  thinkingText: { fontSize: 12, fontFamily: "Inter_400Regular", marginLeft: 4 },
  codeBlock: { borderRadius: 10, borderWidth: 1, overflow: "hidden", marginVertical: 4 },
  codeHeader: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: "#1e293b" },
  codeLang: { fontSize: 10, fontFamily: "Inter_500Medium", color: "#64748b", textTransform: "uppercase" },
  codeText: { fontSize: 12, fontFamily: "monospace", color: "#e2e8f0", padding: 10, lineHeight: 18 },
  inputArea: { borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 12, paddingTop: 10, gap: 8 },
  toolbar: { flexDirection: "row", alignItems: "center", gap: 8 },
  toolbarBtn: { width: 30, height: 30, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  toolbarSpacer: { flex: 1 },
  contextText: { fontSize: 10, fontFamily: "Inter_400Regular" },
  attachStrip: { flexGrow: 0, flexShrink: 0 },
  attachStripContent: { flexDirection: "row", gap: 8, paddingVertical: 2 },
  attachThumbWrap: { width: 64, height: 64, borderRadius: 10, overflow: "hidden", position: "relative" },
  attachThumb: { width: 64, height: 64 },
  attachRemove: { position: "absolute", top: 2, right: 2 },
  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  input: { flex: 1, borderRadius: 20, borderWidth: 1, paddingHorizontal: 14, paddingTop: 9, paddingBottom: 9, fontSize: 14, fontFamily: "Inter_400Regular", maxHeight: 120 },
  sendBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  searchBar: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  emptyChat: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 32, transform: [{ scaleY: -1 }] },
  emptyChatIcon: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
  emptyChatTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  emptyChatSub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  renameOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", paddingHorizontal: 24 },
  renameBox: { width: "100%", borderRadius: 16, borderWidth: 1, padding: 20, gap: 16 },
  renameTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  renameInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: "Inter_400Regular" },
  renameActions: { flexDirection: "row", gap: 10 },
  renameBtn: { flex: 1, borderRadius: 10, paddingVertical: 11, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  renameBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  menuBackdrop: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 99 },
  menuDropdown: {
    position: "absolute",
    top: 0,
    right: 14,
    zIndex: 100,
    borderRadius: 14,
    borderWidth: 1,
    minWidth: 210,
    paddingVertical: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
  },
  menuItem: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 11 },
  menuItemText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  menuDivider: { height: StyleSheet.hairlineWidth, marginHorizontal: 10 },
  modelModalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.6)" },
  modelModalBox: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, padding: 20, gap: 14 },
  modelModalHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  modelModalTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  providerChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, alignSelf: "flex-start" },
  modelPickItem: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 6 },
  defaultBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
});
