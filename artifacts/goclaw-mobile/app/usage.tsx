import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
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
import { useAuth } from "@/context/AuthContext";

interface SummaryData {
  requests: number;
  input_tokens: number;
  output_tokens: number;
  cost: number;
  errors: number;
  unique_users: number;
  llm_calls: number;
  tool_calls: number;
  avg_duration_ms: number;
}

interface BreakdownRow {
  key: string;
  request_count: number;
  llm_call_count: number;
  input_tokens: number;
  output_tokens: number;
  error_count: number;
  avg_duration_ms: number;
  total_cost: number;
}

interface TimeSeriesPoint {
  bucket_time: string;
  input_tokens: number;
  output_tokens: number;
  request_count: number;
  llm_call_count: number;
  error_count: number;
  total_cost: number;
}

const PERIODS = [
  { label: "Hôm nay", value: "day", from: () => new Date(new Date().setHours(0, 0, 0, 0)).toISOString(), to: () => new Date().toISOString() },
  { label: "7 ngày", value: "week", from: () => new Date(Date.now() - 7 * 86400000).toISOString(), to: () => new Date().toISOString() },
  { label: "30 ngày", value: "month", from: () => new Date(Date.now() - 30 * 86400000).toISOString(), to: () => new Date().toISOString() },
];

function fmtNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return String(n);
}

function fmtCost(n: number): string {
  if (n === 0) return "—";
  return "$" + n.toFixed(4);
}

function fmtDuration(ms: number): string {
  if (!ms || ms === 0) return "—";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function StatCard({ label, value, icon, color, hint }: { label: string; value: string; icon: keyof typeof Ionicons["glyphMap"]; color: string; hint?: string }) {
  const colors = useColors();
  return (
    <View style={[statStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[statStyles.iconWrap, { backgroundColor: color + "18" }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <Text style={[statStyles.value, { color: colors.foreground }]}>{value}</Text>
      <Text style={[statStyles.label, { color: colors.mutedForeground }]}>{label}</Text>
      {hint && <Text style={[statStyles.hint, { color: colors.mutedForeground }]}>{hint}</Text>}
    </View>
  );
}

const statStyles = StyleSheet.create({
  card: { flex: 1, minWidth: 140, borderRadius: 14, borderWidth: 1, padding: 14, gap: 6 },
  iconWrap: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  value: { fontSize: 22, fontFamily: "Inter_700Bold" },
  label: { fontSize: 11, fontFamily: "Inter_400Regular" },
  hint: { fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 2 },
});

function BreakdownSection({ title, rows, colors }: { title: string; rows: BreakdownRow[]; colors: ReturnType<typeof useColors> }) {
  if (rows.length === 0) return null;
  const maxReq = Math.max(...rows.map((r) => r.request_count), 1);
  return (
    <View style={[brkStyles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[brkStyles.title, { color: colors.foreground }]}>{title}</Text>
      {rows.slice(0, 8).map((r) => (
        <View key={r.key} style={brkStyles.row}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={[brkStyles.key, { color: colors.foreground }]} numberOfLines={1}>{r.key || "unknown"}</Text>
            <View style={[brkStyles.barBg, { backgroundColor: colors.border }]}>
              <View style={[brkStyles.barFill, { backgroundColor: colors.primary, width: `${(r.request_count / maxReq) * 100}%` as any }]} />
            </View>
          </View>
          <View style={brkStyles.stats}>
            <Text style={[brkStyles.statVal, { color: colors.foreground }]}>{fmtNumber(r.request_count)}</Text>
            <Text style={[brkStyles.statLabel, { color: colors.mutedForeground }]}>req</Text>
          </View>
          <View style={brkStyles.stats}>
            <Text style={[brkStyles.statVal, { color: colors.foreground }]}>{fmtNumber(r.input_tokens + r.output_tokens)}</Text>
            <Text style={[brkStyles.statLabel, { color: colors.mutedForeground }]}>tok</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const brkStyles = StyleSheet.create({
  section: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 12 },
  title: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  key: { fontSize: 12, fontFamily: "Inter_400Regular" },
  barBg: { height: 4, borderRadius: 2, overflow: "hidden" },
  barFill: { height: 4, borderRadius: 2 },
  stats: { alignItems: "center", minWidth: 36 },
  statVal: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  statLabel: { fontSize: 9, fontFamily: "Inter_400Regular" },
});

export default function UsageScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { http, connected } = useAuth();
  const [period, setPeriod] = useState(1);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState<{ current: SummaryData; previous: SummaryData } | null>(null);
  const [providers, setProviders] = useState<BreakdownRow[]>([]);
  const [models, setModels] = useState<BreakdownRow[]>([]);
  const [channels, setChannels] = useState<BreakdownRow[]>([]);
  const topPad = insets.top;

  const loadData = useCallback(async () => {
    if (!http || !connected) return;
    const sel = PERIODS[period];
    const from = sel.from();
    const to = sel.to();
    setLoading(true);
    try {
      const [sumRes, provRes, modRes, chRes] = await Promise.all([
        http.get<{ current: SummaryData; previous: SummaryData }>("/v1/usage/summary", { from, to, period: sel.value }),
        http.get<{ rows: BreakdownRow[] }>("/v1/usage/breakdown", { from, to, group_by: "provider" }),
        http.get<{ rows: BreakdownRow[] }>("/v1/usage/breakdown", { from, to, group_by: "model" }),
        http.get<{ rows: BreakdownRow[] }>("/v1/usage/breakdown", { from, to, group_by: "channel" }),
      ]);
      setSummary(sumRes);
      setProviders(provRes.rows ?? []);
      setModels(modRes.rows ?? []);
      setChannels(chRes.rows ?? []);
    } catch {}
    finally { setLoading(false); }
  }, [http, connected, period]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  const cur = summary?.current;
  const prev = summary?.previous;

  function trend(curr?: number, pre?: number): string {
    if (!curr || !pre || pre === 0) return "";
    const pct = ((curr - pre) / pre) * 100;
    if (Math.abs(pct) < 1) return "";
    return (pct > 0 ? "↑" : "↓") + Math.abs(pct).toFixed(0) + "%";
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 4, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>Usage Analytics</Text>
        <TouchableOpacity onPress={loadData} style={[styles.iconBtn, { backgroundColor: colors.muted }]} activeOpacity={0.7}>
          {loading ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="refresh-outline" size={15} color={colors.mutedForeground} />}
        </TouchableOpacity>
      </View>

      {/* Period selector */}
      <View style={styles.periodRow}>
        {PERIODS.map((p, i) => (
          <TouchableOpacity
            key={p.value}
            style={[styles.periodBtn, { backgroundColor: i === period ? colors.primary : colors.secondary, borderColor: i === period ? colors.primary : colors.border }]}
            onPress={() => setPeriod(i)}
            activeOpacity={0.8}
          >
            <Text style={[styles.periodText, { color: i === period ? "#fff" : colors.mutedForeground }]}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {!connected ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={40} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Chưa kết nối server</Text>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
          contentContainerStyle={{ padding: 14, gap: 14, paddingBottom: insets.bottom + 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Summary stat cards - 2 col grid */}
          {loading && !cur ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.primary} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Đang tải...</Text>
            </View>
          ) : cur ? (
            <>
              {/* Row 1 */}
              <View style={styles.cardRow}>
                <StatCard label="Requests" value={fmtNumber(cur.requests)} icon="send-outline" color="#60a5fa" hint={trend(cur.requests, prev?.requests)} />
                <StatCard label="Tokens" value={fmtNumber(cur.input_tokens + cur.output_tokens)} icon="swap-horizontal-outline" color="#a78bfa" hint={trend(cur.input_tokens + cur.output_tokens, (prev?.input_tokens ?? 0) + (prev?.output_tokens ?? 0))} />
              </View>
              {/* Row 2 */}
              <View style={styles.cardRow}>
                <StatCard label="LLM Calls" value={fmtNumber(cur.llm_calls)} icon="chatbubbles-outline" color="#22c55e" hint={trend(cur.llm_calls, prev?.llm_calls)} />
                <StatCard label="Tool Calls" value={fmtNumber(cur.tool_calls)} icon="construct-outline" color="#f59e0b" hint={trend(cur.tool_calls, prev?.tool_calls)} />
              </View>
              {/* Row 3 */}
              <View style={styles.cardRow}>
                <StatCard label="Errors" value={fmtNumber(cur.errors)} icon="alert-circle-outline" color="#ef4444" hint={trend(cur.errors, prev?.errors)} />
                <StatCard label="Avg Duration" value={fmtDuration(cur.avg_duration_ms)} icon="timer-outline" color="#f97316" />
              </View>
              <View style={styles.cardRow}>
                <StatCard label="Users" value={fmtNumber(cur.unique_users)} icon="people-outline" color="#06b6d4" hint={trend(cur.unique_users, prev?.unique_users)} />
                <StatCard label="Est. Cost" value={fmtCost(cur.cost)} icon="wallet-outline" color="#ec4899" hint={cur.cost === 0 ? "Chưa cấu hình giá" : undefined} />
              </View>

              {/* Breakdowns */}
              <BreakdownSection title="Theo Provider" rows={providers} colors={colors} />
              <BreakdownSection title="Theo Model" rows={models} colors={colors} />
              <BreakdownSection title="Theo Channel" rows={channels} colors={colors} />
            </>
          ) : (
            <View style={styles.center}>
              <Ionicons name="bar-chart-outline" size={44} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Chưa có dữ liệu</Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Bắt đầu chat với agent để ghi nhận usage</Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth, gap: 8 },
  backBtn: { padding: 4 },
  title: { flex: 1, fontSize: 17, fontFamily: "Inter_600SemiBold" },
  iconBtn: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  periodRow: { flexDirection: "row", paddingHorizontal: 14, paddingVertical: 10, gap: 8 },
  periodBtn: { flex: 1, paddingVertical: 8, alignItems: "center", borderRadius: 10, borderWidth: 1 },
  periodText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  cardRow: { flexDirection: "row", gap: 12 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60, gap: 10 },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
});
