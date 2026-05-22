import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { Task, TaskStatus, TaskPriority } from "@/context/AppContext";

const STATUS_CONFIG: Record<TaskStatus, { icon: keyof typeof Ionicons["glyphMap"]; color: string; label: string }> = {
  active: { icon: "play-circle", color: "#3B82F6", label: "Active" },
  pending: { icon: "time-outline", color: "#F59E0B", label: "Pending" },
  completed: { icon: "checkmark-circle", color: "#22C55E", label: "Done" },
  failed: { icon: "close-circle", color: "#EF4444", label: "Failed" },
  paused: { icon: "pause-circle", color: "#8B5CF6", label: "Paused" },
};

const PRIORITY_CONFIG: Record<TaskPriority, { color: string; label: string }> = {
  high: { color: "#EF4444", label: "High" },
  medium: { color: "#F59E0B", label: "Medium" },
  low: { color: "#6B7280", label: "Low" },
};

interface TaskItemProps {
  task: Task;
  onPress?: () => void;
}

export function TaskItem({ task, onPress }: TaskItemProps) {
  const colors = useColors();
  const status = STATUS_CONFIG[task.status];
  const priority = PRIORITY_CONFIG[task.priority];

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Ionicons name={status.icon} size={22} color={status.color} style={styles.icon} />

      <View style={styles.content}>
        <Text
          style={[styles.title, { color: colors.foreground }, task.status === "completed" && styles.completed]}
          numberOfLines={1}
        >
          {task.title}
        </Text>
        <Text style={[styles.desc, { color: colors.mutedForeground }]} numberOfLines={1}>
          {task.description}
        </Text>
        <View style={styles.meta}>
          {task.agentName && (
            <View style={[styles.agentTag, { backgroundColor: colors.secondary }]}>
              <Ionicons name="hardware-chip-outline" size={10} color={colors.mutedForeground} />
              <Text style={[styles.agentText, { color: colors.mutedForeground }]}>{task.agentName}</Text>
            </View>
          )}
          <View style={[styles.priorityDot, { backgroundColor: priority.color }]} />
          <Text style={[styles.priorityText, { color: priority.color }]}>{priority.label}</Text>
        </View>
      </View>

      <View style={[styles.statusBadge, { backgroundColor: status.color + "20" }]}>
        <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
      </View>
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
  icon: {
    flexShrink: 0,
  },
  content: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  completed: {
    opacity: 0.5,
    textDecorationLine: "line-through",
  },
  desc: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  agentTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  agentText: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
  },
  priorityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  priorityText: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    flexShrink: 0,
  },
  statusText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
  },
});
