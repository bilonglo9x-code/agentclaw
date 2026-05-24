import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";

interface SpanData {
  id: string;
  name: string;
  kind?: string;
  status?: string;
  start_time?: string;
  end_time?: string;
  duration_ms?: number;
  input_tokens?: number;
  output_tokens?: number;
  cost?: number;
  model?: string;
  error?: string;
  attributes?: Record<string, unknown>;
  children?: SpanData[];
}

interface TraceDetail {
  id: string;
  agent_id?: string;
  agent_name?: string;
  session_key?: string;
  channel?: string;
  status: string;
  started_at?: string;
  finished_at?: string;
  duration_ms?: number;
  input_tokens?: number;
  output_tokens?: number;
  total_cost?: number;
  llm_call_count?: number;
  tool_call_count?: number;
  error?: string;
  spans?: SpanData[];
}

const STATUS_CONFIG: Record<string, { color: string; icon: keyof typeof Ionicons["glyphMap"] }> = {
  completed: { color: "#22c55e", icon: "checkmark-circle-outline" },
  running: { color: "#60a5fa", icon: "sync-outline" },
  failed: { color: "#ef4444", icon: "alert-circle-outline" },
  cancelled: { color: "#a1a1aa", icon: "stop-circle-outline" },
};

function fmtDur(ms?: number): string {
  if (!ms) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function fmtTime(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("vi", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function SpanRow({ span, depth, colors }: { span: SpanData; depth: number; colors: ReturnType<typeof useColors> }) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = (span.children?.length ?? 0) > 0;
  const statusColor = span.status === "ERROR" ? "#ef4444" : span.status === "OK" ? "#22c55e" : "#a1a1aa";

  return (
    <View>
      <TouchableOpacity
        style={[styles.spanRow, { marginLeft: depth * 14, borderLeftColor: statusColor + "60", borderLeftWidth: 2 }]}
        onPress={() => hasChildren && setExpanded(!expanded)}
        activeOpacity={hasChildren ? 0.7 : 1}
      >
        <View style={styles.spanHeader}>
          {hasChildren && (
            <Ionicons name={expanded ? "chevron-down" : "chevron-forward"} size={11} color={colors.mutedForeground} />
          )}
          <View style={[styles.spanDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.spanName, { color: colors.foreground }]} numberOfLines={1}>{span.name}</Text>
          {span.model && <Text style={[styles.spanModel, { color: colors.mutedForeground }]}>{span.model}</Text>}
        </View>
        <View style={styles.spanMeta}>
          {span.duration_ms != null && <Text style={[styles.spanDur, { color: colors.mutedForeground }]}>{fmtDur(span.duration_ms)}</Text>}
          {(span.input_tokens ?? 0) + (span.output_tokens ?? 0) > 0 && (
            <Text style={[styles.spanTokens, { color: colors.mutedForeground }]}>
              {(span.input_tokens ?? 0) + (span.output_tokens ?? 0)} tok
            </Text>
          )}
        </View>
      </TouchableOpacity>
      {span.error && (
        <View style={[styles.spanError, { marginLeft: depth * 14 + 14, backgroundColor: "#ef444412" }]}>
          <Text style={{ fontSize: 10, fontFamily: "Inter_400Regular", color: "#ef4444" }} numberOfLines={3}>{span.error}</Text>
        </View>
      )}
      {expanded && span.children?.map((c) => (
        <SpanRow key={c.id} span={c} depth={depth + 1} colors={colors} />
      ))}
    </View>
  );
}

export default function TraceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { http, connected } = useAuth();
  const [trace, setTrace] = useState<TraceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const topPad = insets.top;

  const load = useCallback(async () => {
    if (!http || !id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await http.get<TraceDetail>(`/v1/traces/${id}`);
      setTrace(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load trace");
    } finally {
      setLoading(false);
    }
  }, [http, id]);

  useEffect(() => { if (connected) load(); }, [connected, load]);

  const cfg = STATUS_CONFIG[trace?.status ?? ""] ?? STATUS_CONFIG.completed;

  const StatPill = ({ label, value, color }: { label: string; value: string; color?: string }) => (
    <View style={[styles.statPill, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.statValue, { color: color ?? colors.foreground }]}>{value}</Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 4 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>
          {trace?.agent_name ?? "Trace Detail"}
        </Text>
        <TouchableOpacity onPress={load} style={[styles.iconBtn, { backgroundColor: colors.muted }]} activeOpacity={0.7}>
          {loading ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="refresh-outline" size={15} color={colors.mutedForeground} />}
        </TouchableOpacity>
      </View>

      {loading && !trace ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} size="large" /></View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={36} color={colors.destructive} />
          <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
          <TouchableOpacity onPress={load} style={[styles.retryBtn, { backgroundColor: colors.primary }]} activeOpacity={0.7}>
            <Text style={styles.retryText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : trace ? (
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
          {/* Status banner */}
          <View style={[styles.statusBanner, { backgroundColor: cfg.color + "15", borderColor: cfg.color + "30" }]}>
            <Ionicons name={cfg.icon} size={20} color={cfg.color} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.statusLabel, { color: cfg.color }]}>{trace.status.toUpperCase()}</Text>
              <Text style={[styles.statusId, { color: colors.mutedForeground }]} numberOfLines={1}>{trace.id}</Text>
            </View>
            {trace.total_cost != null && trace.total_cost > 0 && (
              <Text style={[styles.cost, { color: "#f59e0b" }]}>${trace.total_cost.toFixed(6)}</Text>
            )}
          </View>

          {/* Metadata */}
          <View style={styles.statsWrap}>
            <StatPill label="Duration" value={fmtDur(trace.duration_ms)} />
            <StatPill label="In tokens" value={String(trace.input_tokens ?? 0)} color="#60a5fa" />
            <StatPill label="Out tokens" value={String(trace.output_tokens ?? 0)} color="#a78bfa" />
            {trace.llm_call_count != null && <StatPill label="LLM calls" value={String(trace.llm_call_count)} />}
            {trace.tool_call_count != null && <StatPill label="Tool calls" value={String(trace.tool_call_count)} />}
          </View>

          {/* Info rows */}
          <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {[
              { label: "Agent", value: trace.agent_name ?? trace.agent_id ?? "—" },
              { label: "Channel", value: trace.channel ?? "—" },
              { label: "Session", value: trace.session_key ? trace.session_key.split(":").pop() ?? trace.session_key : "—" },
              { label: "Bắt đầu", value: fmtTime(trace.started_at) },
              { label: "Kết thúc", value: fmtTime(trace.finished_at) },
            ].map(({ label, value }, i, arr) => (
              <View key={label} style={[styles.infoRow, i < arr.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
                <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{label}</Text>
                <Text style={[styles.infoValue, { color: colors.foreground }]} numberOfLines={1}>{value}</Text>
              </View>
            ))}
          </View>

          {/* Error */}
          {trace.error && (
            <View style={[styles.errorBox, { backgroundColor: "#ef444412", borderColor: "#ef444430" }]}>
              <Ionicons name="alert-circle-outline" size={14} color="#ef4444" />
              <Text style={[styles.errorMsg, { color: "#ef4444" }]}>{trace.error}</Text>
            </View>
          )}

          {/* Span tree */}
          {(trace.spans?.length ?? 0) > 0 && (
            <View style={[styles.spansCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.spansTitle, { color: colors.foreground }]}>Span Tree</Text>
              {trace.spans!.map((s) => <SpanRow key={s.id} span={s} depth={0} colors={colors} />)}
            </View>
          )}

          {(trace.spans?.length ?? 0) === 0 && !trace.error && (
            <View style={styles.noSpans}>
              <Ionicons name="git-branch-outline" size={28} color={colors.mutedForeground} />
              <Text style={[styles.noSpansText, { color: colors.mutedForeground }]}>Không có span data</Text>
            </View>
          )}
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingBottom: 10, gap: 8 },
  backBtn: { padding: 4 },
  title: { flex: 1, fontSize: 18, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  iconBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
  errorText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  retryText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#fff" },
  content: { paddingHorizontal: 14, paddingTop: 6, gap: 12 },
  statusBanner: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 16, borderWidth: 1, padding: 14 },
  statusLabel: { fontSize: 13, fontFamily: "Inter_700Bold" },
  statusId: { fontSize: 11, fontFamily: "monospace", marginTop: 2 },
  cost: { fontSize: 16, fontFamily: "Inter_700Bold" },
  statsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statPill: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 8, alignItems: "center", minWidth: 70 },
  statLabel: { fontSize: 10, fontFamily: "Inter_500Medium" },
  statValue: { fontSize: 16, fontFamily: "Inter_700Bold", marginTop: 2 },
  infoCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  infoRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 11 },
  infoLabel: { width: 80, fontSize: 12, fontFamily: "Inter_500Medium" },
  infoValue: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "right" },
  errorBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, borderRadius: 12, borderWidth: 1, padding: 12 },
  errorMsg: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular" },
  spansCard: { borderRadius: 16, borderWidth: 1, padding: 12 },
  spansTitle: { fontSize: 13, fontFamily: "Inter_700Bold", marginBottom: 10 },
  spanRow: { paddingLeft: 10, paddingVertical: 6, paddingRight: 8, marginBottom: 2 },
  spanHeader: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1 },
  spanDot: { width: 6, height: 6, borderRadius: 3, flexShrink: 0 },
  spanName: { flex: 1, fontSize: 12, fontFamily: "Inter_500Medium" },
  spanModel: { fontSize: 10, fontFamily: "monospace" },
  spanMeta: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 },
  spanDur: { fontSize: 10, fontFamily: "Inter_400Regular" },
  spanTokens: { fontSize: 10, fontFamily: "Inter_400Regular" },
  spanError: { borderRadius: 6, padding: 6, marginBottom: 4, marginTop: 2 },
  noSpans: { alignItems: "center", paddingVertical: 32, gap: 8 },
  noSpansText: { fontSize: 13, fontFamily: "Inter_400Regular" },
});
