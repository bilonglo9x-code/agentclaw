import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { useTraces, TraceData } from "@/hooks/useTraces";

const STATUS_CONFIG: Record<string, { color: string; icon: keyof typeof Ionicons["glyphMap"] }> = {
  running: { color: "#60a5fa", icon: "sync-outline" },
  completed: { color: "#22c55e", icon: "checkmark-circle-outline" },
  failed: { color: "#ef4444", icon: "close-circle-outline" },
  cancelled: { color: "#a1a1aa", icon: "stop-circle-outline" },
};

const MOCK_TRACES: TraceData[] = [
  { id: "t1", agent_id: "assistant", agent_name: "Assistant", status: "completed", started_at: new Date(Date.now() - 120000).toISOString(), duration_ms: 3200, input_tokens: 512, output_tokens: 1024, total_cost: 0.0015, tool_call_count: 2, llm_call_count: 1 },
  { id: "t2", agent_id: "coder", agent_name: "Code Expert", status: "running", started_at: new Date(Date.now() - 30000).toISOString(), input_tokens: 2048, output_tokens: 0, tool_call_count: 5, llm_call_count: 3 },
  { id: "t3", agent_id: "researcher", agent_name: "Researcher", status: "failed", started_at: new Date(Date.now() - 300000).toISOString(), duration_ms: 28000, input_tokens: 4096, output_tokens: 256, error: "Provider timeout", llm_call_count: 2 },
  { id: "t4", agent_id: "writer", agent_name: "Writer", status: "completed", started_at: new Date(Date.now() - 600000).toISOString(), duration_ms: 5400, input_tokens: 1024, output_tokens: 2048, total_cost: 0.0022, tool_call_count: 0, llm_call_count: 2 },
];

function fmtDuration(ms?: number): string {
  if (!ms) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function fmtTokens(n?: number): string {
  if (!n) return "0";
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  if (diff < 60000) return "Vừa xong";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m trước`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h trước`;
  return d.toLocaleDateString("vi");
}

type StatusFilter = "all" | "running" | "completed" | "failed";

const FILTERS: { label: string; value: StatusFilter }[] = [
  { label: "Tất cả", value: "all" },
  { label: "Running", value: "running" },
  { label: "Completed", value: "completed" },
  { label: "Failed", value: "failed" },
];

export default function TracesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { connected } = useAuth();
  const { traces: liveTraces, loading, error, refresh } = useTraces(50);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const traces = connected && liveTraces.length > 0 ? liveTraces : MOCK_TRACES;
  const filtered = filter === "all" ? traces : traces.filter((t) => t.status === filter);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 4 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>Traces</Text>
        <TouchableOpacity onPress={refresh} style={[styles.iconBtn, { backgroundColor: colors.muted }]} activeOpacity={0.7}>
          {loading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons name="refresh-outline" size={16} color={colors.mutedForeground} />
          )}
        </TouchableOpacity>
      </View>

      {/* Summary row */}
      <View style={styles.summaryRow}>
        {(["running", "completed", "failed"] as StatusFilter[]).map((s) => {
          const cnt = traces.filter((t) => t.status === s).length;
          const cfg = STATUS_CONFIG[s];
          return (
            <View key={s} style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.summaryCount, { color: cfg.color }]}>{cnt}</Text>
              <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>{s}</Text>
            </View>
          );
        })}
      </View>

      {/* Filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {FILTERS.map((f) => {
          const active = filter === f.value;
          const cfg = f.value !== "all" ? STATUS_CONFIG[f.value] : null;
          return (
            <TouchableOpacity
              key={f.value}
              onPress={() => setFilter(f.value)}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? (cfg?.color ?? colors.primary) + "20" : colors.muted,
                  borderColor: active ? (cfg?.color ?? colors.primary) + "60" : colors.border,
                },
              ]}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, { color: active ? (cfg?.color ?? colors.primary) : colors.mutedForeground }]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {error && (
        <View style={[styles.errorBanner, { backgroundColor: colors.destructive + "15", borderColor: colors.destructive + "30" }]}>
          <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
        </View>
      )}

      <FlatList
        data={filtered}
        keyExtractor={(t) => t.id}
        renderItem={({ item }) => {
          const cfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.completed;
          return (
            <TouchableOpacity
              style={[styles.traceCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              activeOpacity={0.8}
            >
              <View style={styles.traceTop}>
                <View style={styles.traceLeft}>
                  <Ionicons name={cfg.icon} size={15} color={cfg.color} />
                  <Text style={[styles.traceAgent, { color: colors.foreground }]}>
                    {item.agent_name ?? item.agent_id ?? "Agent"}
                  </Text>
                  {item.channel && (
                    <View style={[styles.channelBadge, { backgroundColor: colors.muted }]}>
                      <Text style={[styles.channelText, { color: colors.mutedForeground }]}>{item.channel}</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.traceTime, { color: colors.mutedForeground }]}>{fmtTime(item.started_at)}</Text>
              </View>

              <View style={styles.traceMeta}>
                <View style={styles.traceMetaItem}>
                  <Ionicons name="time-outline" size={12} color={colors.mutedForeground} />
                  <Text style={[styles.traceMetaText, { color: colors.mutedForeground }]}>{fmtDuration(item.duration_ms)}</Text>
                </View>
                <View style={styles.traceMetaItem}>
                  <Ionicons name="layers-outline" size={12} color={colors.mutedForeground} />
                  <Text style={[styles.traceMetaText, { color: colors.mutedForeground }]}>
                    {fmtTokens((item.input_tokens ?? 0) + (item.output_tokens ?? 0))} tok
                  </Text>
                </View>
                {(item.tool_call_count ?? 0) > 0 && (
                  <View style={styles.traceMetaItem}>
                    <Ionicons name="settings-outline" size={12} color={colors.mutedForeground} />
                    <Text style={[styles.traceMetaText, { color: colors.mutedForeground }]}>{item.tool_call_count} tools</Text>
                  </View>
                )}
                {item.total_cost != null && item.total_cost > 0 && (
                  <View style={styles.traceMetaItem}>
                    <Ionicons name="wallet-outline" size={12} color={colors.mutedForeground} />
                    <Text style={[styles.traceMetaText, { color: colors.mutedForeground }]}>${item.total_cost.toFixed(4)}</Text>
                  </View>
                )}
              </View>

              {item.error && (
                <Text style={[styles.traceError, { color: colors.destructive }]} numberOfLines={1}>
                  {item.error}
                </Text>
              )}
            </TouchableOpacity>
          );
        }}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="search-outline" size={36} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Không có traces</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 10,
    gap: 8,
  },
  backBtn: { padding: 4 },
  title: { flex: 1, fontSize: 20, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  iconBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  summaryRow: { flexDirection: "row", gap: 10, paddingHorizontal: 16, marginBottom: 12 },
  summaryCard: { flex: 1, borderRadius: 14, borderWidth: 1, padding: 12, alignItems: "center" },
  summaryCount: { fontSize: 22, fontFamily: "Inter_700Bold" },
  summaryLabel: { fontSize: 11, fontFamily: "Inter_500Medium", marginTop: 2, textTransform: "capitalize" },
  chips: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 10, gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  errorBanner: { marginHorizontal: 16, marginBottom: 8, borderRadius: 10, borderWidth: 1, padding: 10 },
  errorText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  list: { paddingHorizontal: 14, paddingTop: 4, gap: 8 },
  traceCard: { borderRadius: 16, borderWidth: 1, padding: 14, gap: 8 },
  traceTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  traceLeft: { flexDirection: "row", alignItems: "center", gap: 7, flex: 1 },
  traceAgent: { fontSize: 14, fontFamily: "Inter_600SemiBold", flex: 1 },
  channelBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  channelText: { fontSize: 10, fontFamily: "Inter_500Medium" },
  traceTime: { fontSize: 11, fontFamily: "Inter_400Regular" },
  traceMeta: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  traceMetaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  traceMetaText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  traceError: { fontSize: 12, fontFamily: "Inter_400Regular" },
  emptyWrap: { alignItems: "center", paddingTop: 80, gap: 10 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
});
