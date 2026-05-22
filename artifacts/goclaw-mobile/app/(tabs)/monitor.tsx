import React, { useEffect, useRef, useState } from "react";
import {
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { useLogs, LogLevel, LogEntry } from "@/hooks/useLogs";
import { useApprovals } from "@/hooks/useApprovals";

type Filter = "all" | LogLevel;

const FILTER_TABS: { label: string; value: Filter }[] = [
  { label: "All", value: "all" },
  { label: "Error", value: "error" },
  { label: "Warn", value: "warn" },
  { label: "Info", value: "info" },
  { label: "Debug", value: "debug" },
];

const LEVEL_CONFIG: Record<LogLevel, { color: string; bg: string; icon: keyof typeof Ionicons["glyphMap"] }> = {
  info: { color: "#60a5fa", bg: "#60a5fa20", icon: "information-circle-outline" },
  warn: { color: "#f59e0b", bg: "#f59e0b20", icon: "warning-outline" },
  error: { color: "#ef4444", bg: "#ef444420", icon: "alert-circle-outline" },
  debug: { color: "#a1a1aa", bg: "#a1a1aa15", icon: "code-outline" },
};

const MOCK_LOGS: LogEntry[] = [
  { id: "1", timestamp: Date.now() - 120000, level: "info", message: "Agent 'Sales Assistant' completed task successfully", source: "agent" },
  { id: "2", timestamp: Date.now() - 180000, level: "warn", message: "Rate limit approaching: 85% of hourly quota used", source: "api" },
  { id: "3", timestamp: Date.now() - 240000, level: "error", message: "Embedding provider timeout after 30s", source: "provider" },
  { id: "4", timestamp: Date.now() - 300000, level: "info", message: "Memory consolidation job started (scheduled)", source: "scheduler" },
  { id: "5", timestamp: Date.now() - 360000, level: "debug", message: "Tool call: query_database({table: 'sales', month: 5})", source: "skill" },
  { id: "6", timestamp: Date.now() - 420000, level: "info", message: "New session opened — user: admin@goclaw.dev", source: "auth" },
  { id: "7", timestamp: Date.now() - 480000, level: "warn", message: "Context window at 78% — consider summarizing", source: "agent" },
  { id: "8", timestamp: Date.now() - 540000, level: "error", message: "Webhook delivery failed: 3 retries exhausted", source: "webhook" },
  { id: "9", timestamp: Date.now() - 600000, level: "info", message: "Cron job 'daily_report' completed in 2.3s", source: "scheduler" },
  { id: "10", timestamp: Date.now() - 660000, level: "debug", message: "Cache hit: embedding vector for document #4821", source: "cache" },
];

function formatTs(ts: number): string {
  return new Date(ts).toLocaleTimeString("vi", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export default function MonitorScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { connected } = useAuth();
  const { logs, tailing, level, error: tailError, startTail, stopTail, clearLogs, setLevel } = useLogs();
  const { pendingCount } = useApprovals();
  const [filter, setFilter] = useState<Filter>("all");
  const listRef = useRef<FlatList>(null);
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const displayLogs = connected && logs.length > 0 ? logs : MOCK_LOGS;

  const filtered = filter === "all"
    ? displayLogs
    : displayLogs.filter((l) => l.level === filter);

  const counts = displayLogs.reduce((acc, l) => {
    acc[l.level as LogLevel] = (acc[l.level as LogLevel] ?? 0) + 1;
    return acc;
  }, {} as Record<LogLevel, number>);

  useEffect(() => {
    if (filtered.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [filtered.length]);

  const toggleTail = () => {
    if (tailing) stopTail();
    else startTail(level as LogLevel);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <View>
          <Text style={[styles.title, { color: colors.foreground }]}>Monitor</Text>
          <View style={styles.statsRow}>
            <View style={[styles.dot, { backgroundColor: "#ef4444" }]} />
            <Text style={[styles.statsText, { color: "#ef4444" }]}>{counts.error ?? 0} errors</Text>
            <Text style={[styles.sep, { color: colors.border }]}>·</Text>
            <View style={[styles.dot, { backgroundColor: "#f59e0b" }]} />
            <Text style={[styles.statsText, { color: "#f59e0b" }]}>{counts.warn ?? 0} warns</Text>
            {pendingCount > 0 && (
              <>
                <Text style={[styles.sep, { color: colors.border }]}>·</Text>
                <View style={[styles.dot, { backgroundColor: colors.primary }]} />
                <Text style={[styles.statsText, { color: colors.primary }]}>{pendingCount} approvals</Text>
              </>
            )}
          </View>
        </View>

        <View style={styles.headerRight}>
          {tailError && (
            <Ionicons name="alert-circle-outline" size={16} color={colors.destructive} />
          )}
          <TouchableOpacity
            style={[
              styles.liveBtn,
              {
                borderColor: tailing ? colors.success + "50" : colors.border,
                backgroundColor: tailing ? colors.success + "15" : colors.muted,
              },
            ]}
            onPress={connected ? toggleTail : undefined}
            activeOpacity={0.7}
          >
            {tailing ? (
              <>
                <View style={[styles.liveDot, { backgroundColor: colors.success }]} />
                <Text style={[styles.liveBtnText, { color: colors.success }]}>Live</Text>
              </>
            ) : (
              <>
                <Ionicons name="play-outline" size={12} color={colors.mutedForeground} />
                <Text style={[styles.liveBtnText, { color: colors.mutedForeground }]}>Tail</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: colors.muted }]}
            onPress={clearLogs}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={15} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Alert bar for pending approvals */}
      {pendingCount > 0 && (
        <View style={[styles.approvalAlert, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "40" }]}>
          <Ionicons name="shield-outline" size={14} color={colors.primary} />
          <Text style={[styles.approvalText, { color: colors.primary }]}>
            {pendingCount} tool execution{pendingCount > 1 ? "s" : ""} chờ duyệt
          </Text>
          <TouchableOpacity activeOpacity={0.7}>
            <Text style={[styles.approvalAction, { color: colors.primary }]}>Review →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Level filter chips */}
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
                  borderColor: active ? ((cfg?.color ?? colors.primary) + "60") : colors.border,
                },
              ]}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, { color: active ? (cfg?.color ?? colors.primary) : colors.mutedForeground }]}>
                {f.label}
              </Text>
              {f.value !== "all" && (counts[f.value as LogLevel] ?? 0) > 0 && (
                <View style={[styles.countBadge, { backgroundColor: cfg!.color + "25" }]}>
                  <Text style={[styles.countText, { color: cfg!.color }]}>{counts[f.value as LogLevel]}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Log list */}
      {filtered.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="receipt-outline" size={36} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Không có logs</Text>
          <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
            {connected ? "Nhấn Tail để bắt đầu nhận logs realtime" : "Kết nối server để xem logs"}
          </Text>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const lvl = (item.level as LogLevel) in LEVEL_CONFIG ? item.level as LogLevel : "info";
            const cfg = LEVEL_CONFIG[lvl];
            return (
              <View style={[styles.logRow, { borderBottomColor: colors.border }]}>
                <View style={[styles.levelDot, { backgroundColor: cfg.color }]} />
                <View style={styles.logContent}>
                  <View style={styles.logTop}>
                    {item.source && (
                      <View style={[styles.sourceBadge, { backgroundColor: colors.muted }]}>
                        <Text style={[styles.sourceText, { color: colors.mutedForeground }]}>{item.source}</Text>
                      </View>
                    )}
                    <Text style={[styles.logTime, { color: colors.mutedForeground }]}>
                      {formatTs(item.timestamp)}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.logMessage,
                      { color: lvl === "error" ? cfg.color : lvl === "warn" ? cfg.color : colors.foreground },
                    ]}
                  >
                    {item.message}
                  </Text>
                  {item.attrs && Object.keys(item.attrs).length > 0 && (
                    <Text style={[styles.logAttrs, { color: colors.mutedForeground }]}>
                      {Object.entries(item.attrs).map(([k, v]) => `${k}=${v}`).join(" ")}
                    </Text>
                  )}
                </View>
              </View>
            );
          }}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 110 }]}
          showsVerticalScrollIndicator={false}
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
    paddingBottom: 10,
  },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
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
  },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  liveBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  iconBtn: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  approvalAlert: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  approvalText: { flex: 1, fontSize: 12, fontFamily: "Inter_500Medium" },
  approvalAction: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  chips: { paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
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
  logTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  sourceBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  sourceText: { fontSize: 10, fontFamily: "Inter_500Medium" },
  logTime: { fontSize: 10, fontFamily: "Inter_400Regular" },
  logMessage: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  logAttrs: { fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 2 },
  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  emptySubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 18 },
});
