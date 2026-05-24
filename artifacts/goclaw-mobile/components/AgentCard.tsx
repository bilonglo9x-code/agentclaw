import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { Agent } from "@/context/AppContext";

const STATUS_CONFIG = {
  active: { color: "#22c55e", label: "active" },
  idle: { color: "#71717a", label: "idle" },
  summoning: { color: "#60a5fa", label: "loading" },
  offline: { color: "#52525b", label: "offline" },
} as const;

const TYPE_CONFIG = {
  predefined: { label: "System", color: "#60a5fa", bg: "#60a5fa18" },
  open: { label: "Agent", color: "#60a5fa", bg: "#60a5fa18" },
  team: { label: "Team", color: "#a78bfa", bg: "#a78bfa18" },
} as const;

const EMOJI_MAP: Record<string, string> = {
  "Sales Assistant": "🤖",
  "Data Analyst": "📊",
  "Content Writer": "✍️",
  "Support Team": "👥",
  "Research Bot": "🔍",
  "DevOps Agent": "⚙️",
};

interface AgentCardProps {
  agent: Agent;
  onPress: () => void;
  onChatPress?: () => void;
  isFavorite?: boolean;
  onFavorite?: () => void;
}

export function AgentCard({ agent, onPress, onChatPress, isFavorite, onFavorite }: AgentCardProps) {
  const colors = useColors();
  const statusCfg = STATUS_CONFIG[agent.status];
  const typeCfg = TYPE_CONFIG[agent.type as keyof typeof TYPE_CONFIG] ?? TYPE_CONFIG.open;
  const emoji = EMOJI_MAP[agent.displayName] ?? "🤖";

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      {/* Top row: emoji + type badge + status */}
      <View style={styles.topRow}>
        <View style={[styles.emojiBox, { backgroundColor: colors.secondary }]}>
          <Text style={styles.emoji}>{emoji}</Text>
        </View>
        <View style={styles.topRight}>
          <View style={styles.badgeRow}>
            <View style={[styles.typeBadge, { backgroundColor: typeCfg.bg, borderColor: typeCfg.color + "40" }]}>
              <Text style={[styles.typeBadgeText, { color: typeCfg.color }]}>{typeCfg.label}</Text>
            </View>
            {onFavorite && (
              <TouchableOpacity onPress={onFavorite} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }} activeOpacity={0.7}>
                <Ionicons name={isFavorite ? "star" : "star-outline"} size={14} color={isFavorite ? "#f59e0b" : colors.mutedForeground} />
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: statusCfg.color }]} />
            <Text style={[styles.statusText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
          </View>
        </View>
      </View>

      {/* Name + model */}
      <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
        {agent.displayName}
      </Text>
      <Text style={[styles.model, { color: colors.mutedForeground }]} numberOfLines={1}>
        {agent.model.split("-").slice(0, 2).join("-")}
      </Text>

      {/* Chat button */}
      <TouchableOpacity
        style={[styles.chatBtn, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "35" }]}
        onPress={onChatPress ?? onPress}
        activeOpacity={0.7}
      >
        <Text style={[styles.chatBtnText, { color: colors.primary }]}>Chat ngay →</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    gap: 6,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  emojiBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  emoji: { fontSize: 22 },
  topRight: { alignItems: "flex-end", gap: 4 },
  badgeRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  typeBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  typeBadgeText: { fontSize: 9, fontFamily: "Inter_700Bold" },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 9, fontFamily: "Inter_500Medium" },
  name: { fontSize: 14, fontFamily: "Inter_600SemiBold", lineHeight: 18 },
  model: { fontSize: 10, fontFamily: "Inter_400Regular" },
  chatBtn: {
    marginTop: 4,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 7,
    alignItems: "center",
  },
  chatBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
});
