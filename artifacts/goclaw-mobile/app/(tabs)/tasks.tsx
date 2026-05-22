import React, { useMemo, useState } from "react";
import {
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useApp, TaskStatus } from "@/context/AppContext";
import { TaskItem } from "@/components/TaskItem";
import { EmptyState } from "@/components/EmptyState";

type Filter = "all" | TaskStatus;

const FILTERS: { label: string; value: Filter; icon: keyof typeof Ionicons["glyphMap"] }[] = [
  { label: "All", value: "all", icon: "apps-outline" },
  { label: "Active", value: "active", icon: "play-circle-outline" },
  { label: "Pending", value: "pending", icon: "time-outline" },
  { label: "Done", value: "completed", icon: "checkmark-circle-outline" },
  { label: "Failed", value: "failed", icon: "close-circle-outline" },
];

export default function TasksScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { tasks } = useApp();
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = useMemo(
    () => (filter === "all" ? tasks : tasks.filter((t) => t.status === filter)),
    [tasks, filter]
  );

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: tasks.length };
    tasks.forEach((t) => { counts[t.status] = (counts[t.status] ?? 0) + 1; });
    return counts;
  }, [tasks]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <View>
          <Text style={[styles.title, { color: colors.foreground }]}>Tasks</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            {statusCounts.active ?? 0} active · {statusCounts.pending ?? 0} pending
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
      >
        {FILTERS.map((f) => {
          const count = statusCounts[f.value] ?? 0;
          const active = filter === f.value;
          return (
            <TouchableOpacity
              key={f.value}
              onPress={() => setFilter(f.value)}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? colors.primary : colors.muted,
                  borderColor: active ? colors.primary : colors.border,
                },
              ]}
              activeOpacity={0.7}
            >
              <Ionicons
                name={f.icon}
                size={13}
                color={active ? "#fff" : colors.mutedForeground}
              />
              <Text style={[styles.chipText, { color: active ? "#fff" : colors.mutedForeground }]}>
                {f.label}
              </Text>
              {count > 0 && (
                <View style={[styles.countBadge, { backgroundColor: active ? "rgba(255,255,255,0.3)" : colors.border }]}>
                  <Text style={[styles.countText, { color: active ? "#fff" : colors.mutedForeground }]}>
                    {count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {filtered.length === 0 ? (
        <EmptyState
          icon="checkbox-outline"
          title="No tasks"
          subtitle={filter === "all" ? "Create a task to get started" : `No ${filter} tasks right now`}
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <TaskItem task={item} />}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!!filtered.length}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  chips: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  countBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
  },
  countText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
  },
  list: { paddingTop: 8 },
});
