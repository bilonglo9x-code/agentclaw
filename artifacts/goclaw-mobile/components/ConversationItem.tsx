import React, { useRef, useState } from "react";
import { Animated, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { Conversation } from "@/context/AppContext";

function formatTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  if (diff < 60000) return "Now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

interface ConversationItemProps {
  conversation: Conversation;
  onPress: () => void;
  onDelete?: () => void;
}

export function ConversationItem({ conversation, onPress, onDelete }: ConversationItemProps) {
  const colors = useColors();
  const initials = conversation.agentName.slice(0, 2).toUpperCase();
  const hasUnread = conversation.unread > 0;
  const [showDelete, setShowDelete] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const toggleDelete = () => {
    const toValue = showDelete ? 0 : 1;
    setShowDelete(!showDelete);
    Animated.spring(slideAnim, { toValue, useNativeDriver: true }).start();
  };

  const deleteTranslate = slideAnim.interpolate({ inputRange: [0, 1], outputRange: [72, 0] });

  return (
    <View style={{ overflow: "hidden" }}>
      {onDelete && (
        <Animated.View style={[styles.deleteAction, { transform: [{ translateX: deleteTranslate }] }]}>
          <TouchableOpacity
            style={[styles.deleteBtn, { backgroundColor: "#ef4444" }]}
            onPress={() => { setShowDelete(false); onDelete(); }}
            activeOpacity={0.8}
          >
            <Ionicons name="trash-outline" size={18} color="#fff" />
          </TouchableOpacity>
        </Animated.View>
      )}
    <TouchableOpacity
      style={[styles.container, { borderBottomColor: colors.border }]}
      onPress={() => { if (showDelete) { toggleDelete(); } else { onPress(); } }}
      onLongPress={() => { if (onDelete) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); toggleDelete(); } }}
      delayLongPress={400}
      activeOpacity={0.7}
    >
      <View style={[styles.avatar, { backgroundColor: colors.primary + "25" }]}>
        <Text style={[styles.initials, { color: colors.primary }]}>{initials}</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={[styles.name, { color: colors.foreground }, hasUnread && styles.nameBold]}>
            {conversation.agentName}
          </Text>
          <Text style={[styles.time, { color: hasUnread ? colors.primary : colors.mutedForeground }]}>
            {formatTime(conversation.lastMessageAt)}
          </Text>
        </View>
        <View style={styles.bottomRow}>
          <Text
            style={[styles.lastMessage, { color: hasUnread ? colors.foreground : colors.mutedForeground }, hasUnread && styles.lastMessageBold]}
            numberOfLines={1}
          >
            {conversation.lastMessage}
          </Text>
          {hasUnread ? (
            <View style={[styles.badge, { backgroundColor: colors.primary }]}>
              <Text style={styles.badgeText}>{conversation.unread}</Text>
            </View>
          ) : (
            <Ionicons name="checkmark-done" size={14} color={colors.primary} />
          )}
        </View>
        <Text style={[styles.model, { color: colors.mutedForeground }]}>{conversation.model}</Text>
      </View>
    </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  initials: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  content: {
    flex: 1,
    gap: 2,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  name: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  nameBold: {
    fontFamily: "Inter_600SemiBold",
  },
  time: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  lastMessage: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    flex: 1,
  },
  lastMessageBold: {
    fontFamily: "Inter_500Medium",
  },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontFamily: "Inter_700Bold",
  },
  model: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  deleteAction: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 72,
    justifyContent: "center",
    alignItems: "center",
  },
  deleteBtn: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
});
