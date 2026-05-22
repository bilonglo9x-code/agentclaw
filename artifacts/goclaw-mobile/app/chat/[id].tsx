import React, { useCallback, useRef, useState } from "react";
import {
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
import { useApp, Message } from "@/context/AppContext";
import * as Haptics from "expo-haptics";

interface ToolCallBadgeProps {
  colors: ReturnType<typeof useColors>;
}

function ToolCallBadge({ colors }: ToolCallBadgeProps) {
  return (
    <View
      style={[
        styles.toolBadge,
        { backgroundColor: "#3b82f615", borderColor: "#3b82f630" },
      ]}
    >
      <Ionicons name="settings-outline" size={12} color="#60a5fa" />
      <Text style={styles.toolBadgeText}>query_database</Text>
      <Text style={[styles.toolBadgeDuration, { color: colors.mutedForeground }]}>· 0.3s</Text>
    </View>
  );
}

function ThinkingBubble({ colors }: { colors: ReturnType<typeof useColors> }) {
  return (
    <View style={styles.bubbleWrap}>
      <View style={[styles.agentAvatar, { backgroundColor: colors.primary + "20" }]}>
        <Ionicons name="sparkles" size={13} color={colors.primary} />
      </View>
      <View style={[styles.bubble, styles.assistantBubble, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.thinkingDots}>
          <View style={[styles.dot, { backgroundColor: colors.primary }]} />
          <View style={[styles.dot, { backgroundColor: colors.primary }]} />
          <View style={[styles.dot, { backgroundColor: colors.primary }]} />
          <Text style={[styles.thinkingText, { color: colors.mutedForeground }]}>Đang xử lý...</Text>
        </View>
      </View>
    </View>
  );
}

function MessageBubble({ message, colors }: { message: Message; colors: ReturnType<typeof useColors> }) {
  const isUser = message.role === "user";

  if (message.streaming) {
    return <ThinkingBubble colors={colors} />;
  }

  return (
    <View style={[styles.bubbleWrap, isUser ? styles.userWrap : styles.assistantWrap]}>
      {!isUser && (
        <View style={[styles.agentAvatar, { backgroundColor: colors.primary + "20" }]}>
          <Ionicons name="sparkles" size={13} color={colors.primary} />
        </View>
      )}
      <View style={styles.bubbleContent}>
        {!isUser && message.content.includes("query") && (
          <ToolCallBadge colors={colors} />
        )}
        <View
          style={[
            styles.bubble,
            isUser
              ? [styles.userBubble, { backgroundColor: "#7c3400" }]
              : [styles.assistantBubble, { backgroundColor: colors.card, borderColor: colors.border }],
          ]}
        >
          <Text style={[styles.bubbleText, { color: colors.foreground }]}>
            {message.content}
          </Text>
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
  const [text, setText] = useState("");
  const inputRef = useRef<TextInput>(null);

  const conversation = conversations.find((c) => c.id === id);
  const messages = getMessages(id ?? "");

  const handleSend = useCallback(() => {
    if (!text.trim() || !id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    sendMessage(id, text.trim());
    setText("");
  }, [text, id, sendMessage]);

  if (!conversation) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.mutedForeground, textAlign: "center", marginTop: 40 }}>
          Conversation not found
        </Text>
      </View>
    );
  }

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior="padding"
      keyboardVerticalOffset={0}
    >
      {/* Header */}
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
            {conversation.agentName.slice(0, 2).toUpperCase()}
          </Text>
        </View>

        <View style={styles.agentInfo}>
          <View style={styles.agentNameRow}>
            <Text style={[styles.agentName, { color: colors.foreground }]}>{conversation.agentName}</Text>
            <View style={[styles.onlineDot, { backgroundColor: colors.success }]} />
          </View>
          <TouchableOpacity activeOpacity={0.7}>
            <View style={[styles.modelBadge, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
              <Text style={[styles.modelBadgeText, { color: colors.mutedForeground }]}>
                {conversation.model} ▾
              </Text>
            </View>
          </TouchableOpacity>
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

      {/* Messages */}
      <FlatList
        data={[...messages].reverse()}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <MessageBubble message={item} colors={colors} />}
        inverted
        contentContainerStyle={[
          styles.messageList,
          { paddingBottom: 16, paddingTop: insets.bottom + 80 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        scrollEnabled={!!messages.length}
      />

      {/* Input area */}
      <View
        style={[
          styles.inputArea,
          { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: insets.bottom + 8 },
        ]}
      >
        {/* Toolbar row */}
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

        {/* Text + send row */}
        <View style={styles.inputRow}>
          <TextInput
            ref={inputRef}
            style={[
              styles.input,
              { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.foreground },
            ]}
            value={text}
            onChangeText={setText}
            placeholder="Nhập tin nhắn..."
            placeholderTextColor={colors.mutedForeground}
            multiline
            maxLength={4000}
            returnKeyType="default"
          />
          <TouchableOpacity
            style={[styles.sendBtn, { backgroundColor: text.trim() ? colors.primary : colors.secondary }]}
            onPress={handleSend}
            disabled={!text.trim()}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-up" size={18} color={text.trim() ? "#fff" : colors.mutedForeground} />
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
  agentAvatarLg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  agentInitials: { fontSize: 13, fontFamily: "Inter_700Bold" },
  agentInfo: { flex: 1, gap: 3 },
  agentNameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  agentName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  onlineDot: { width: 7, height: 7, borderRadius: 4 },
  modelBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  modelBadgeText: { fontSize: 10, fontFamily: "Inter_400Regular" },
  headerActions: { flexDirection: "row", gap: 6 },
  iconBtn: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  messageList: { paddingHorizontal: 14 },
  bubbleWrap: {
    marginVertical: 5,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  userWrap: { justifyContent: "flex-end" },
  assistantWrap: { justifyContent: "flex-start" },
  agentAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginBottom: 16,
  },
  bubbleContent: { maxWidth: "80%", gap: 3 },
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
  toolBadgeDuration: { fontSize: 10, fontFamily: "Inter_400Regular" },
  bubble: {
    padding: 11,
    borderRadius: 18,
  },
  userBubble: { borderBottomRightRadius: 4 },
  assistantBubble: { borderBottomLeftRadius: 4, borderWidth: 1 },
  bubbleText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 21 },
  bubbleTime: { fontSize: 10, fontFamily: "Inter_400Regular" },
  timeRight: { textAlign: "right" },
  thinkingDots: { flexDirection: "row", alignItems: "center", gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  thinkingText: { fontSize: 12, fontFamily: "Inter_400Regular", marginLeft: 4 },
  inputArea: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingTop: 10,
    gap: 8,
  },
  toolbar: { flexDirection: "row", alignItems: "center", gap: 8 },
  toolbarBtn: { width: 30, height: 30, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  toolbarSpacer: { flex: 1 },
  contextText: { fontSize: 10, fontFamily: "Inter_400Regular" },
  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  input: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingTop: 9,
    paddingBottom: 9,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    maxHeight: 120,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
});
