import React, { useState } from "react";
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

type LogLevel = "info" | "warn" | "error" | "debug";

interface LogEntry {
  id: string;
  level: LogLevel;
  message: string;
  time: string;
  source: string;
}

const LOGS: LogEntry[] = [
  { id: "1", level: "info", message: "Agent 'Sales Assistant' completed task successfully", time: "09:41:23", source: "agent" },
  { id: "2", level: "warn", message: "Rate limit approaching: 85% of hourly quota used", time: "09:40:18", source: "api" },
  { id: "3", level: "error", message: "Embedding provider timeout after 30s", time: "09:38:05", source: "provider" },
  { id: "4", level: "info", message: "Memory consolidation job started (scheduled)", time: "09:35:00", source: "scheduler" },
  { id: "5", level: "debug", message: "Tool call: query_database({table: 'sales', month: 5})", time: "09:34:51", source: "skill" },
  { id: "6", level: "info", message: "New session opened — user: admin@goclaw.dev", time: "09:33:12", source: "auth" },
  { id: "7", level: "warn", message: "Context window at 78% — consider summarizing", time: "09:32:44", source: "agent" },
  { id: "8", level: "error", message: "Webhook delivery failed: 3 retries exhausted", time: "09:30:00", source: "webhook" },
  { id: "9", level: "info", message: "Cron job 'daily_report' completed in 2.3s", time: "09:00:01", source: "scheduler" },
  { id: "10", level: "debug", message: "Cache hit: embedding vector for document #4821", time: "08:58:33", source: "cache" },
];

const LEVEL_CONFIG: Record<LogLevel, { color: string; bg: string; icon: keyof typeof Ionicons["glyphMap"] }> = {
  info: { color: "#60a5fa", bg: "#60a5fa20", icon: "information-circle-outline" },
  warn: { color: "#f59e0b", bg: "#f59e0b20", icon: "warning-outline" },
  error: { color: "#ef4444", bg: "#ef444420", icon: "alert-circle-outline" },
  debug: { color: "#a1a1aa", bg: "#a1a1aa15", icon: "code-outline" },
};

type Filter = "all" | LogLevel;

const FILTER_TABS: { label: string; value: Filter }[] = [
  { label: "All", value: "all" },
  { label: "Error", value: "error" },
  { label: "Warn", value: "warn" },
  { label: "Info", value: "info" },
  { label: "Debug", value: "debug" },
];

export default function MonitorScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<Filter>("all");
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const filtered = filter === "all" ? LOGS : LOGS.filter((l) => l.level === filter);

  const counts = LOGS.reduce((acc, l) => {
    acc[l.level] = (acc[l.level] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <View>
          <Text style={[styles.title, { color: colors.foreground }]}>Monitor</Text>
          <View style={styles.statsRow}>
            <View style={[styles.dot, { backgroundColor: "#ef4444" }]} />
            <Text style={[styles.statsText, { color: "#ef4444" }]}>{counts.error ?? 0} errors</Text>
            <Text style={[styles.sep, { color: colors.border }]}>·</Text>
            <View style={[styles.dot, { backgroundColor: "#f59e0b" }]} />
            <Text style={[styles.statsText, { color: "#f59e0b" }]}>{counts.warn ?? 0} warns</Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.liveBtn, { borderColor: colors.success + "50", backgroundColor: colors.success + "15" }]}
          activeOpacity={0.7}
        >
          <View style={[styles.liveDot, { backgroundColor: colors.success }]} />
          <Text style={[styles.liveBtnText, { color: colors.success }]}>Live</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
      >
        {FILTER_TABS.map((f) => {
          const active = filter === f.value;
          const cfg = f.value !== "all" ? LEVEL_CONFIG[f.value as LogLevel] : null;
          return (
            <TouchableOpacity
              key={f.value}
              onPress={() => setFilter(f.value)}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? (cfg?.bg ?? colors.muted) : colors.muted,
                  borderColor: active ? (cfg?.color ?? colors.primary) + "60" : colors.border,
                },
              ]}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, { color: active ? (cfg?.color ?? colors.primary) : colors.mutedForeground }]}>
                {f.label}
              </Text>
              {f.value !== "all" && counts[f.value] ? (
                <View style={[styles.countBadge, { backgroundColor: cfg!.color + "25" }]}>
                  <Text style={[styles.countText, { color: cfg!.color }]}>{counts[f.value]}</Text>
                </View>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const cfg = LEVEL_CONFIG[item.level];
          return (
            <View style={[styles.logRow, { borderBottomColor: colors.border }]}>
              <View style={[styles.levelDot, { backgroundColor: cfg.color }]} />
              <View style={styles.logContent}>
                <View style={styles.logTop}>
                  <View style={[styles.sourceBadge, { backgroundColor: colors.muted }]}>
                    <Text style={[styles.sourceText, { color: colors.mutedForeground }]}>{item.source}</Text>
                  </View>
                  <Text style={[styles.logTime, { color: colors.mutedForeground }]}>{item.time}</Text>
                </View>
                <Text style={[styles.logMessage, { color: item.level === "error" ? cfg.color : colors.foreground }]}>
                  {item.message}
                </Text>
              </View>
            </View>
          );
        }}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 110 }]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!!filtered.length}
      />
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
    paddingBottom: 10,
  },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  statsRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 4 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  statsText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  sep: { fontSize: 12 },
  liveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 4,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  liveBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  chips: { paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  chip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  countBadge: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: 6 },
  countText: { fontSize: 10, fontFamily: "Inter_700Bold" },
  list: { paddingTop: 4 },
  logRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  levelDot: { width: 7, height: 7, borderRadius: 4, marginTop: 5, flexShrink: 0 },
  logContent: { flex: 1 },
  logTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 3 },
  sourceBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  sourceText: { fontSize: 10, fontFamily: "Inter_500Medium" },
  logTime: { fontSize: 10, fontFamily: "Inter_400Regular" },
  logMessage: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
});
