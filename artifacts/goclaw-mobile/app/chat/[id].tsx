import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
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
import { useColors } from "@/hooks/useColors";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { useMessages } from "@/hooks/useMessages";
import * as Haptics from "expo-haptics";

interface MsgBubbleProps {
  role: "user" | "assistant" | "tool";
  content: string;
  isStreaming?: boolean;
  toolName?: string;
  colors: ReturnType<typeof useColors>;
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
    return (
      <Text key={i} style={[styles.bubbleText, { color: colors.foreground }]}>{p.text}</Text>
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
        <Text style={[styles.bubbleTime, { color: colors.mutedForeground }, isUser && styles.timeRight]}>
          {new Date().toLocaleTimeString("vi", { hour: "2-digit", minute: "2-digit" })}
          {isUser ? " ✓✓" : ""}
        </Text>
      </View>
    </View>
  );
}

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { conversations, getMessages, sendMessage } = useApp();
  const { connected } = useAuth();
  const [text, setText] = useState("");
  const inputRef = useRef<TextInput>(null);

  const conversation = conversations.find((c) => c.id === id);
  const mockMessages = getMessages(id ?? "");

  const sessionKey = id?.includes(":") ? id : undefined;
  const { messages: liveMessages, sending, isRunning, activity, send: sendLive } = useMessages(
    sessionKey ?? "",
  );

  const useLive = connected && !!sessionKey && liveMessages.length > 0;

  const displayMessages = useLive ? liveMessages : mockMessages;

  const agentName = conversation?.agentName ?? id?.split(":")[1] ?? "Agent";
  const model = conversation?.model ?? "";

  const handleSend = useCallback(() => {
    if (!text.trim() || !id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (sessionKey && connected) {
      sendLive(text.trim());
    } else {
      sendMessage(id, text.trim());
    }
    setText("");
  }, [text, id, sessionKey, connected, sendLive, sendMessage]);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const canSend = text.trim().length > 0 && !sending && !isRunning;

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
            <Text style={[styles.agentName, { color: colors.foreground }]}>{agentName}</Text>
            {isRunning && (
              <View style={[styles.runningDot, { backgroundColor: colors.primary }]} />
            )}
          </View>
          {model ? (
            <TouchableOpacity activeOpacity={0.7}>
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
          <TouchableOpacity style={[styles.iconBtn, { backgroundColor: colors.secondary }]} activeOpacity={0.7}>
            <Ionicons name="search-outline" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.iconBtn, { backgroundColor: colors.secondary }]} activeOpacity={0.7}>
            <Ionicons name="ellipsis-horizontal" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>
      </View>

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
        contentContainerStyle={[styles.messageList, { paddingBottom: 16, paddingTop: insets.bottom + 80 }]}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
      />

      <View
        style={[
          styles.inputArea,
          { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: insets.bottom + 8 },
        ]}
      >
        <View style={styles.toolbar}>
          <TouchableOpacity style={[styles.toolbarBtn, { backgroundColor: colors.secondary }]} activeOpacity={0.7}>
            <Ionicons name="attach" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.toolbarBtn, { backgroundColor: colors.secondary }]} activeOpacity={0.7}>
            <Ionicons name="mic-outline" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.toolbarBtn, { backgroundColor: colors.secondary }]} activeOpacity={0.7}>
            <Ionicons name="camera-outline" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
          <View style={styles.toolbarSpacer} />
          <Text style={[styles.contextText, { color: colors.mutedForeground }]}>context: 12% ▓░░░░</Text>
        </View>

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
  bubbleTime: { fontSize: 10, fontFamily: "Inter_400Regular" },
  timeRight: { textAlign: "right" },
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
  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  input: { flex: 1, borderRadius: 20, borderWidth: 1, paddingHorizontal: 14, paddingTop: 9, paddingBottom: 9, fontSize: 14, fontFamily: "Inter_400Regular", maxHeight: 120 },
  sendBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
});
