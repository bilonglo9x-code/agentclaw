import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { Flow, FlowStatus } from "@/context/AppContext";

const STATUS_CONFIG: Record<FlowStatus, { icon: keyof typeof Ionicons["glyphMap"]; color: string; label: string }> = {
  active: { icon: "radio-button-on", color: "#22C55E", label: "Active" },
  paused: { icon: "pause-circle-outline", color: "#F59E0B", label: "Paused" },
  completed: { icon: "checkmark-circle-outline", color: "#6B7280", label: "Done" },
  error: { icon: "alert-circle", color: "#EF4444", label: "Error" },
  draft: { icon: "document-outline", color: "#8B5CF6", label: "Draft" },
};

function formatRelative(date?: Date): string {
  if (!date) return "Never";
  const diff = Date.now() - date.getTime();
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

interface FlowItemProps {
  flow: Flow;
  onPress?: () => void;
}

export function FlowItem({ flow, onPress }: FlowItemProps) {
  const colors = useColors();
  const status = STATUS_CONFIG[flow.status];

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={[styles.iconWrap, { backgroundColor: status.color + "18" }]}>
        <Ionicons name="git-network-outline" size={20} color={status.color} />
      </View>

      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
            {flow.name}
          </Text>
          <View style={[styles.statusPill, { backgroundColor: status.color + "20" }]}>
            <View style={[styles.dot, { backgroundColor: status.color }]} />
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>
        <Text style={[styles.desc, { color: colors.mutedForeground }]} numberOfLines={1}>
          {flow.description}
        </Text>
        <View style={styles.meta}>
          <Ionicons name="layers-outline" size={11} color={colors.mutedForeground} />
          <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{flow.stepCount} steps</Text>
          <Text style={[styles.separator, { color: colors.border }]}>·</Text>
          <Ionicons name="time-outline" size={11} color={colors.mutedForeground} />
          <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{formatRelative(flow.lastRunAt)}</Text>
        </View>
      </View>

      <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  content: {
    flex: 1,
    gap: 3,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  name: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    flex: 1,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    flexShrink: 0,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  statusText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
  },
  desc: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  metaText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  separator: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginHorizontal: 2,
  },
});
