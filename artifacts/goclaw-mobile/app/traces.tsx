import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
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
import { SearchBar } from "@/components/SearchBar";
import { useAuth } from "@/context/AuthContext";
import { useTraces, TraceData } from "@/hooks/useTraces";

const STATUS_CONFIG: Record<string, { color: string; icon: keyof typeof Ionicons["glyphMap"] }> = {
  running: { color: "#60a5fa", icon: "sync-outline" },
  completed: { color: "#22c55e", icon: "checkmark-circle-outline" },
  failed: { color: "#ef4444", icon: "close-circle-outline" },
  cancelled: { color: "#a1a1aa", icon: "stop-circle-outline" },
};

const MOCK_TRACES: TraceData[] = [
  { id: "t1", agent_id: "assistant", agent_name: "Sales Bot", status: "completed", started_at: new Date(Date.now() - 120000).toISOString(), duration_ms: 3200, input_tokens: 512, output_tokens: 1024, total_cost: 0.0015, tool_call_count: 2, llm_call_count: 1 },
  { id: "t2", agent_id: "coder", agent_name: "Code Expert", status: "running", started_at: new Date(Date.now() - 30000).toISOString(), input_tokens: 2048, output_tokens: 0, tool_call_count: 5, llm_call_count: 3 },
  { id: "t3", agent_id: "researcher", agent_name: "Researcher", status: "failed", started_at: new Date(Date.now() - 300000).toISOString(), duration_ms: 28000, input_tokens: 4096, output_tokens: 256, error: "Provider timeout after 30s", llm_call_count: 2 },
  { id: "t4", agent_id: "writer", agent_name: "Writer", status: "completed", started_at: new Date(Date.now() - 600000).toISOString(), duration_ms: 5400, input_tokens: 1024, output_tokens: 2048, total_cost: 0.0022, tool_call_count: 0, llm_call_count: 2 },
  { id: "t5", agent_id: "analyst", agent_name: "Analyst", status: "completed", started_at: new Date(Date.now() - 900000).toISOString(), duration_ms: 8100, input_tokens: 3200, output_tokens: 1500, total_cost: 0.0041, tool_call_count: 4, llm_call_count: 3 },
  { id: "t6", agent_id: "support", agent_name: "Support", status: "cancelled", started_at: new Date(Date.now() - 1200000).toISOString(), duration_ms: 1200, input_tokens: 128, output_tokens: 0, tool_call_count: 0, llm_call_count: 1 },
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
type ViewMode = "list" | "waterfall";

const FILTERS: { label: string; value: StatusFilter }[] = [
  { label: "Tất cả", value: "all" },
  { label: "Running", value: "running" },
  { label: "Completed", value: "completed" },
  { label: "Failed", value: "failed" },
];

function WaterfallView({ traces, colors }: { traces: TraceData[]; colors: ReturnType<typeof import("@/hooks/useColors").useColors> }) {
  const maxDuration = Math.max(...traces.map((t) => t.duration_ms ?? 0), 1000);

  return (
    <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
      {/* Time axis header */}
      <View style={[wfStyles.axisRow, { borderBottomColor: colors.border }]}>
        <View style={wfStyles.labelCol}>
          <Text style={[wfStyles.axisLabel, { color: colors.mutedForeground }]}>Agent</Text>
        </View>
        <View style={wfStyles.barCol}>
          {[0, 25, 50, 75, 100].map((pct) => (
            <Text key={pct} style={[wfStyles.axisTick, { color: colors.mutedForeground, left: `${pct}%` as unknown as number }]}>
              {pct === 0 ? "0" : pct === 100 ? fmtDuration(maxDuration) : ""}
            </Text>
          ))}
        </View>
      </View>

      {traces.map((trace) => {
        const cfg = STATUS_CONFIG[trace.status] ?? STATUS_CONFIG.completed;
        const widthPct = trace.duration_ms ? Math.max(4, (trace.duration_ms / maxDuration) * 100) : 6;
        const isRunning = trace.status === "running";

        const segments = [
          { type: "LLM", color: "#60a5fa", pct: 55 },
          { type: "Tool", color: "#f59e0b", pct: 25 },
          { type: "Memory", color: "#a78bfa", pct: 15 },
          { type: "Other", color: "#a1a1aa", pct: 5 },
        ];

        return (
          <View key={trace.id} style={[wfStyles.traceRow, { borderBottomColor: colors.border }]}>
            <View style={wfStyles.labelCol}>
              <View style={styles.traceLeft}>
                <Ionicons name={cfg.icon} size={12} color={cfg.color} />
                <Text style={[wfStyles.traceName, { color: colors.foreground }]} numberOfLines={1}>
                  {trace.agent_name ?? "Agent"}
                </Text>
              </View>
              <Text style={[wfStyles.traceDuration, { color: colors.mutedForeground }]}>
                {isRunning ? "running..." : fmtDuration(trace.duration_ms)}
              </Text>
            </View>

            <View style={wfStyles.barCol}>
              {/* Track background */}
              <View style={[wfStyles.track, { backgroundColor: colors.secondary }]} />

              {/* Filled bar */}
              <View
                style={[
                  wfStyles.filledBar,
                  {
                    width: `${widthPct}%` as unknown as number,
                    backgroundColor: isRunning ? cfg.color + "30" : cfg.color + "20",
                    borderColor: cfg.color + "60",
                  },
                ]}
              >
                {/* Segments inside bar */}
                {!isRunning && trace.llm_call_count && trace.llm_call_count > 0 && (
                  <View style={wfStyles.segmentsRow}>
                    {segments.map((seg) => (
                      <View
                        key={seg.type}
                        style={[wfStyles.segment, { width: `${seg.pct}%` as unknown as number, backgroundColor: seg.color }]}
                      />
                    ))}
                  </View>
                )}
                {isRunning && (
                  <View style={[wfStyles.runningStripe, { backgroundColor: cfg.color + "40" }]} />
                )}
              </View>

              {/* Cost label on right */}
              {trace.total_cost != null && trace.total_cost > 0 && (
                <Text style={[wfStyles.costLabel, { color: colors.mutedForeground, left: `${widthPct + 1}%` as unknown as number }]}>
                  ${trace.total_cost.toFixed(4)}
                </Text>
              )}
            </View>
          </View>
        );
      })}

      {/* Legend */}
      <View style={[wfStyles.legend, { borderTopColor: colors.border }]}>
        {[
          { color: "#60a5fa", label: "LLM call" },
          { color: "#f59e0b", label: "Tool call" },
          { color: "#a78bfa", label: "Memory" },
          { color: "#a1a1aa", label: "Other" },
        ].map((l) => (
          <View key={l.label} style={wfStyles.legendItem}>
            <View style={[wfStyles.legendDot, { backgroundColor: l.color }]} />
            <Text style={[wfStyles.legendText, { color: colors.mutedForeground }]}>{l.label}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

export default function TracesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { connected } = useAuth();
  const { traces: liveTraces, loading, error, refresh } = useTraces(50);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = async () => { setRefreshing(true); await refresh(); setRefreshing(false); };
  const topPad = insets.top;

  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [agentFilter, setAgentFilter] = useState<string | null>(null);

  const traces = liveTraces;
  const agentNames = useMemo(() => {
    const names = new Set<string>();
    traces.forEach((t) => { if (t.agent_name) names.add(t.agent_name); });
    return Array.from(names).sort();
  }, [traces]);

  const filtered = useMemo(() => {
    let list = filter === "all" ? traces : traces.filter((t) => t.status === filter);
    if (agentFilter) list = list.filter((t) => t.agent_name === agentFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((t) =>
        (t.agent_name ?? t.agent_id ?? "").toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q) ||
        (t.channel ?? "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [traces, filter, agentFilter, search]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 4 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>Traces</Text>

        {/* View mode toggle */}
        <View style={[styles.viewToggle, { backgroundColor: colors.muted }]}>
          <TouchableOpacity
            style={[styles.toggleBtn, viewMode === "list" && { backgroundColor: colors.card }]}
            onPress={() => setViewMode("list")}
            activeOpacity={0.7}
          >
            <Ionicons name="list-outline" size={14} color={viewMode === "list" ? colors.foreground : colors.mutedForeground} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, viewMode === "waterfall" && { backgroundColor: colors.card }]}
            onPress={() => setViewMode("waterfall")}
            activeOpacity={0.7}
          >
            <Ionicons name="analytics-outline" size={14} color={viewMode === "waterfall" ? colors.primary : colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={() => setShowSearch((v) => !v)}
          style={[styles.iconBtn, { backgroundColor: showSearch ? colors.primary + "22" : colors.muted }]}
          activeOpacity={0.7}
        >
          <Ionicons name="search-outline" size={15} color={showSearch ? colors.primary : colors.mutedForeground} />
        </TouchableOpacity>
        <TouchableOpacity onPress={refresh} style={[styles.iconBtn, { backgroundColor: colors.muted }]} activeOpacity={0.7}>
          {loading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons name="refresh-outline" size={16} color={colors.mutedForeground} />
          )}
        </TouchableOpacity>
      </View>

      {showSearch && (
        <View style={styles.searchWrap}>
          <SearchBar value={search} onChangeText={setSearch} placeholder="Tìm agent, trace ID, channel..." />
        </View>
      )}

      {/* Summary row */}
      <View style={styles.summaryRow}>
        {(["running", "completed", "failed"] as StatusFilter[]).map((s) => {
          const cnt = traces.filter((t) => t.status === s).length;
          const cfg = STATUS_CONFIG[s];
          return (
            <TouchableOpacity
              key={s}
              style={[styles.summaryCard, { backgroundColor: filter === s ? cfg.color + "20" : colors.card, borderColor: filter === s ? cfg.color + "60" : colors.border }]}
              activeOpacity={0.8}
              onPress={() => setFilter(filter === s ? "all" : s)}
            >
              <Text style={[styles.summaryCount, { color: cfg.color }]}>{cnt}</Text>
              <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>{s}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Status filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.chips}>
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

      {/* Agent filter chips */}
      {agentNames.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.filterScroll, { marginTop: -4 }]} contentContainerStyle={styles.chips}>
          <TouchableOpacity
            onPress={() => setAgentFilter(null)}
            style={[styles.chip, { backgroundColor: !agentFilter ? colors.primary + "20" : colors.muted, borderColor: !agentFilter ? colors.primary + "60" : colors.border }]}
            activeOpacity={0.7}
          >
            <Text style={[styles.chipText, { color: !agentFilter ? colors.primary : colors.mutedForeground }]}>Tất cả agent</Text>
          </TouchableOpacity>
          {agentNames.map((name) => (
            <TouchableOpacity
              key={name}
              onPress={() => setAgentFilter(agentFilter === name ? null : name)}
              style={[styles.chip, { backgroundColor: agentFilter === name ? "#a78bfa20" : colors.muted, borderColor: agentFilter === name ? "#a78bfa60" : colors.border }]}
              activeOpacity={0.7}
            >
              <Ionicons name="hardware-chip-outline" size={11} color={agentFilter === name ? "#a78bfa" : colors.mutedForeground} />
              <Text style={[styles.chipText, { color: agentFilter === name ? "#a78bfa" : colors.mutedForeground }]}>{name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {error && (
        <View style={[styles.errorBanner, { backgroundColor: colors.destructive + "15", borderColor: colors.destructive + "30" }]}>
          <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
        </View>
      )}

      {viewMode === "waterfall" ? (
        <View style={{ flex: 1, paddingHorizontal: 14 }}>
          <WaterfallView traces={filtered} colors={colors} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(t) => t.id}
          renderItem={({ item }) => {
            const cfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.completed;
            return (
              <TouchableOpacity
                style={[styles.traceCard, { backgroundColor: colors.card, borderColor: item.status === "failed" ? "#ef444440" : colors.border }]}
                activeOpacity={0.8}
                onPress={() => router.push(`/traces/${item.id}` as never)}
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

                {/* Duration bar */}
                {item.duration_ms != null && item.duration_ms > 0 && (
                  <View style={[styles.durationBarTrack, { backgroundColor: colors.secondary }]}>
                    <View
                      style={[
                        styles.durationBarFill,
                        {
                          width: `${Math.min(100, (item.duration_ms / 30000) * 100)}%` as unknown as number,
                          backgroundColor: cfg.color + "60",
                        },
                      ]}
                    />
                    <Text style={[styles.durationLabel, { color: cfg.color }]}>{fmtDuration(item.duration_ms)}</Text>
                  </View>
                )}

                <View style={styles.traceMeta}>
                  <View style={styles.traceMetaItem}>
                    <Ionicons name="layers-outline" size={12} color={colors.mutedForeground} />
                    <Text style={[styles.traceMetaText, { color: colors.mutedForeground }]}>
                      {fmtTokens((item.input_tokens ?? 0) + (item.output_tokens ?? 0))} tok
                    </Text>
                  </View>
                  {(item.llm_call_count ?? 0) > 0 && (
                    <View style={styles.traceMetaItem}>
                      <Ionicons name="sparkles-outline" size={12} color="#60a5fa" />
                      <Text style={[styles.traceMetaText, { color: "#60a5fa" }]}>{item.llm_call_count} LLM</Text>
                    </View>
                  )}
                  {(item.tool_call_count ?? 0) > 0 && (
                    <View style={styles.traceMetaItem}>
                      <Ionicons name="settings-outline" size={12} color="#f59e0b" />
                      <Text style={[styles.traceMetaText, { color: "#f59e0b" }]}>{item.tool_call_count} tools</Text>
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
                  <View style={[styles.errorRow, { backgroundColor: "#ef444415", borderColor: "#ef444430" }]}>
                    <Ionicons name="alert-circle-outline" size={12} color="#ef4444" />
                    <Text style={[styles.traceError, { color: "#ef4444" }]} numberOfLines={2}>
                      {item.error}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="search-outline" size={36} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Không có traces</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const wfStyles = StyleSheet.create({
  axisRow: { flexDirection: "row", alignItems: "center", paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth, marginBottom: 4 },
  traceRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  labelCol: { width: 100, paddingRight: 8 },
  barCol: { flex: 1, height: 28, position: "relative", justifyContent: "center" },
  axisLabel: { fontSize: 10, fontFamily: "Inter_500Medium" },
  axisTick: { fontSize: 8, fontFamily: "Inter_400Regular", position: "absolute" },
  traceName: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  traceDuration: { fontSize: 9, fontFamily: "Inter_400Regular", marginTop: 2 },
  track: { position: "absolute", left: 0, right: 0, height: 18, borderRadius: 4 },
  filledBar: { height: 18, borderRadius: 4, borderWidth: 1, overflow: "hidden", position: "relative" },
  segmentsRow: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, flexDirection: "row" },
  segment: { height: "100%" },
  runningStripe: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0 },
  costLabel: { position: "absolute", fontSize: 9, fontFamily: "Inter_400Regular", top: 5 },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: 12, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, marginTop: 8 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, fontFamily: "Inter_400Regular" },
});

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
  viewToggle: { flexDirection: "row", borderRadius: 10, padding: 3, gap: 2 },
  toggleBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  iconBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  summaryRow: { flexDirection: "row", gap: 10, paddingHorizontal: 16, marginBottom: 12 },
  summaryCard: { flex: 1, borderRadius: 14, borderWidth: 1, padding: 12, alignItems: "center" },
  summaryCount: { fontSize: 22, fontFamily: "Inter_700Bold" },
  summaryLabel: { fontSize: 11, fontFamily: "Inter_500Medium", marginTop: 2, textTransform: "capitalize" },
  filterScroll: { flexGrow: 0, flexShrink: 0 },
  chips: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  chip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1, alignSelf: "flex-start" },
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
  durationBarTrack: { height: 6, borderRadius: 3, overflow: "hidden", position: "relative" },
  durationBarFill: { height: "100%", borderRadius: 3 },
  durationLabel: { position: "absolute", right: 0, top: -10, fontSize: 9, fontFamily: "Inter_500Medium" },
  traceMeta: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  traceMetaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  traceMetaText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  errorRow: { flexDirection: "row", alignItems: "flex-start", gap: 6, borderRadius: 8, borderWidth: 1, padding: 8 },
  traceError: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1 },
  emptyWrap: { alignItems: "center", paddingTop: 80, gap: 10 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  searchWrap: { paddingHorizontal: 14, paddingBottom: 6 },
});
