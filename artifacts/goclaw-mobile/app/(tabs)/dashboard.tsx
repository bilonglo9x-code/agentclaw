import React, { useState } from "react";
import {
  ActivityIndicator,
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
import { useUsage } from "@/hooks/useUsage";
import { useApprovals } from "@/hooks/useApprovals";
import { useAgents } from "@/hooks/useAgents";

type Period = "today" | "7d" | "30d";

function fmt(n: number, decimals = 0): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(decimals);
}

function fmtCost(n: number): string {
  return `$${n.toFixed(2)}`;
}

function pctChange(current: number, previous: number): { text: string; up: boolean | null } {
  if (!previous) return { text: "—", up: null };
  const pct = ((current - previous) / previous) * 100;
  return { text: `${pct >= 0 ? "+" : ""}${pct.toFixed(0)}%`, up: pct >= 0 };
}

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { connected } = useAuth();
  const [period, setPeriod] = useState<Period>("today");
  const { summary, timeseries, loading } = useUsage(period);
  const { pendingCount } = useApprovals();
  const { agents } = useAgents();

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const activeAgents = agents.filter((a) => a.status === "active").length;

  const PERIOD_LABELS: Record<Period, string> = { today: "Hôm nay", "7d": "7 ngày", "30d": "30 ngày" };

  const stats = summary
    ? [
        {
          label: "Requests",
          value: fmt(summary.current.requests),
          ...pctChange(summary.current.requests, summary.previous.requests),
        },
        {
          label: "Tokens",
          value: fmt(summary.current.input_tokens + summary.current.output_tokens),
          ...pctChange(
            summary.current.input_tokens + summary.current.output_tokens,
            summary.previous.input_tokens + summary.previous.output_tokens,
          ),
        },
        {
          label: "Chi phí",
          value: fmtCost(summary.current.cost),
          ...pctChange(summary.current.cost, summary.previous.cost),
        },
        {
          label: "Lỗi",
          value: fmt(summary.current.errors),
          ...pctChange(summary.current.errors, summary.previous.errors),
        },
      ]
    : [
        { label: "Requests hôm nay", value: "1,247", text: "+18%", up: true },
        { label: "Tokens dùng", value: "4.2M", text: "+8%", up: true },
        { label: "Chi phí hôm nay", value: "$2.40", text: "-12%", up: false },
        { label: "Agents active", value: `${activeAgents || 6}/${agents.length || 8}`, text: `${agents.length - activeAgents || 2} idle`, up: null },
      ];

  const barData = timeseries.length > 0
    ? timeseries.slice(-7).map((p) => p.request_count)
    : [40, 65, 55, 80, 70, 90, 85];
  const barMax = Math.max(...barData, 1);
  const barLabels = timeseries.length > 0
    ? timeseries.slice(-7).map((p) => {
        const d = new Date(p.bucket_time);
        return period === "today"
          ? `${d.getHours()}h`
          : d.toLocaleDateString("vi", { weekday: "short" });
      })
    : ["Th2", "Th3", "Th4", "Th5", "Th6", "Th7", "Hôm nay"];

  const lastUpdated = loading ? "Đang tải..." : summary ? "Vừa cập nhật" : "Demo data";

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: topPad + 8, paddingBottom: insets.bottom + 110 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.foreground }]}>Dashboard</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{lastUpdated}</Text>
        </View>
        <View style={styles.headerRight}>
          {loading && <ActivityIndicator size="small" color={colors.primary} />}
          {connected && (
            <View style={styles.liveRow}>
              <View style={[styles.liveDot, { backgroundColor: colors.success }]} />
              <Text style={[styles.liveText, { color: colors.success }]}>Live</Text>
            </View>
          )}
        </View>
      </View>

      {/* Approvals alert */}
      {pendingCount > 0 && (
        <TouchableOpacity
          style={[styles.alert, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "40" }]}
          activeOpacity={0.8}
          onPress={() => router.push("/approvals")}
        >
          <Ionicons name="shield-outline" size={16} color={colors.primary} style={styles.alertIcon} />
          <View style={styles.alertBody}>
            <Text style={[styles.alertTitle, { color: colors.primary }]}>
              {pendingCount} tool execution chờ duyệt
            </Text>
            <Text style={[styles.alertSub, { color: colors.mutedForeground }]}>
              Nhấn để review và approve/deny
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.primary} />
        </TouchableOpacity>
      )}

      {/* Period selector */}
      <View style={styles.periodRow}>
        {(["today", "7d", "30d"] as Period[]).map((p) => (
          <TouchableOpacity
            key={p}
            style={[
              styles.periodBtn,
              {
                backgroundColor: period === p ? colors.primary + "25" : colors.muted,
                borderColor: period === p ? colors.primary + "60" : colors.border,
              },
            ]}
            onPress={() => setPeriod(p)}
            activeOpacity={0.7}
          >
            <Text style={[styles.periodBtnText, { color: period === p ? colors.primary : colors.mutedForeground }]}>
              {PERIOD_LABELS[p]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Stat cards */}
      <View style={styles.statsGrid}>
        {stats.map((stat) => (
          <View key={stat.label} style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{stat.label}</Text>
            <Text style={[styles.statValue, { color: colors.foreground }]}>{stat.value}</Text>
            <View style={styles.statChangeRow}>
              {stat.up !== null && (
                <Text style={{ color: stat.up ? colors.success : colors.destructive, fontSize: 11 }}>
                  {stat.up ? "↑ " : "↓ "}
                </Text>
              )}
              <Text style={[styles.statChange, { color: stat.up === true ? colors.success : stat.up === false ? colors.destructive : colors.mutedForeground }]}>
                {stat.text}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* Request chart */}
      <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.chartHeader}>
          <Text style={[styles.chartTitle, { color: colors.foreground }]}>
            Requests {PERIOD_LABELS[period]}
          </Text>
          {timeseries.length > 0 && (
            <Text style={[styles.chartSubtitle, { color: colors.mutedForeground }]}>
              {fmt(timeseries.reduce((s, p) => s + p.request_count, 0))} total
            </Text>
          )}
        </View>
        <View style={styles.bars}>
          {barData.map((h, i) => (
            <View key={i} style={styles.barWrap}>
              <View
                style={[
                  styles.bar,
                  {
                    height: `${Math.round((h / barMax) * 100)}%` as unknown as number,
                    backgroundColor: i === barData.length - 1 ? colors.primary : colors.primary + "40",
                    borderRadius: 4,
                  },
                ]}
              />
            </View>
          ))}
        </View>
        <View style={styles.barLabels}>
          {barLabels.map((l, i) => (
            <Text key={i} style={[styles.barLabel, { color: colors.mutedForeground }]}>{l}</Text>
          ))}
        </View>
      </View>

      {/* Extra stats from summary */}
      {summary && (
        <View style={[styles.extraCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.extraTitle, { color: colors.foreground }]}>Chi tiết</Text>
          {[
            { label: "LLM Calls", value: fmt(summary.current.llm_calls) },
            { label: "Tool Calls", value: fmt(summary.current.tool_calls) },
            { label: "Avg Duration", value: `${(summary.current.avg_duration_ms / 1000).toFixed(1)}s` },
            { label: "Unique Users", value: fmt(summary.current.unique_users) },
          ].map((item, i, arr) => (
            <View key={item.label} style={[styles.extraRow, { borderBottomColor: colors.border }, i === arr.length - 1 && { borderBottomWidth: 0 }]}>
              <Text style={[styles.extraLabel, { color: colors.mutedForeground }]}>{item.label}</Text>
              <Text style={[styles.extraValue, { color: colors.foreground }]}>{item.value}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Quick actions */}
      <View style={styles.quickActions}>
        {[
          { icon: "search-outline" as const, label: "Traces", onPress: () => router.push("/traces") },
          { icon: "heart-outline" as const, label: "Health", onPress: () => router.push("/health") },
          { icon: "flash-outline" as const, label: "Skills", onPress: () => router.push("/skills") },
          { icon: "shield-checkmark-outline" as const, label: "Approvals", badge: pendingCount, onPress: () => router.push("/approvals") },
          { icon: "chatbubbles-outline" as const, label: "Sessions", onPress: () => router.push("/sessions") },
          { icon: "cube-outline" as const, label: "Packages", onPress: () => router.push("/packages") },
        ].map((a) => (
          <TouchableOpacity
            key={a.label}
            style={[styles.quickBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            activeOpacity={0.7}
            onPress={a.onPress}
          >
            <View style={[styles.quickIcon, { backgroundColor: colors.primary + "18" }]}>
              <Ionicons name={a.icon} size={18} color={colors.primary} />
            </View>
            <Text style={[styles.quickLabel, { color: colors.foreground }]}>{a.label}</Text>
            {!!a.badge && a.badge > 0 && (
              <View style={[styles.quickBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.quickBadgeText}>{a.badge}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16 },
  header: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  subtitle: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 3 },
  liveRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  liveDot: { width: 7, height: 7, borderRadius: 4 },
  liveText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  alert: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 14,
    gap: 10,
  },
  alertIcon: { flexShrink: 0 },
  alertBody: { flex: 1 },
  alertTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  alertSub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  periodRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
  periodBtn: { flex: 1, paddingVertical: 7, borderRadius: 10, borderWidth: 1, alignItems: "center" },
  periodBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 14 },
  statCard: { width: "47.5%", borderRadius: 16, borderWidth: 1, padding: 14 },
  statLabel: { fontSize: 11, fontFamily: "Inter_500Medium", marginBottom: 6 },
  statValue: { fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  statChangeRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  statChange: { fontSize: 11, fontFamily: "Inter_500Medium" },
  chartCard: { borderRadius: 18, borderWidth: 1, padding: 16, marginBottom: 14 },
  chartHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 },
  chartTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  chartSubtitle: { fontSize: 11, fontFamily: "Inter_400Regular" },
  bars: { flexDirection: "row", alignItems: "flex-end", height: 80, gap: 4, marginBottom: 6 },
  barWrap: { flex: 1, height: "100%", justifyContent: "flex-end" },
  bar: { width: "100%" },
  barLabels: { flexDirection: "row", gap: 4 },
  barLabel: { flex: 1, fontSize: 9, fontFamily: "Inter_400Regular", textAlign: "center" },
  extraCard: { borderRadius: 18, borderWidth: 1, padding: 14, marginBottom: 14 },
  extraTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 10 },
  extraRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  extraLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  extraValue: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  quickActions: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  quickBtn: { width: "47.5%", borderRadius: 16, borderWidth: 1, padding: 14, alignItems: "flex-start", position: "relative" },
  quickIcon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  quickLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  quickBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  quickBadgeText: { color: "#fff", fontSize: 10, fontFamily: "Inter_700Bold" },
});
