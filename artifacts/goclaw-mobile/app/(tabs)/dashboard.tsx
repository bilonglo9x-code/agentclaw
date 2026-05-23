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
import { useQuota } from "@/hooks/useQuota";
import { useEvents } from "@/hooks/useEvents";

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

const AGENT_STATUS_COLOR: Record<string, string> = {
  active: "#22c55e",
  idle: "#60a5fa",
  error: "#ef4444",
  offline: "#a1a1aa",
};

const MOCK_ACTIVITY = [
  { id: "1", icon: "checkmark-circle-outline" as const, color: "#22c55e", text: "Agent 'Sales Bot' hoàn thành task", time: "2m" },
  { id: "2", icon: "time-outline" as const, color: "#60a5fa", text: "Cron 'daily_report' chạy lúc 09:00", time: "15m" },
  { id: "3", icon: "warning-outline" as const, color: "#f59e0b", text: "Channel Telegram latency cao (>2s)", time: "32m" },
  { id: "4", icon: "sparkles-outline" as const, color: "#a78bfa", text: "Memory consolidation hoàn tất", time: "1h" },
  { id: "5", icon: "alert-circle-outline" as const, color: "#ef4444", text: "Provider timeout: OpenAI 3 lần", time: "2h" },
];

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { connected } = useAuth();
  const [period, setPeriod] = useState<Period>("today");
  const { summary, timeseries, loading } = useUsage(period);
  const { pendingCount } = useApprovals();
  const { agents } = useAgents();
  const { quota, usagePercent, isNearLimit, isOverLimit } = useQuota();

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const activeAgents = agents.filter((a) => a.status === "active").length;
  const idleAgents = agents.filter((a) => a.status !== "active" && a.status !== "error").length;
  const errorAgents = agents.filter((a) => a.status === "error").length;

  const PERIOD_LABELS: Record<Period, string> = { today: "Hôm nay", "7d": "7 ngày", "30d": "30 ngày" };

  const stats = summary
    ? [
        {
          label: "Requests",
          value: fmt(summary.current.requests),
          ...pctChange(summary.current.requests, summary.previous.requests),
          route: "/traces" as const,
          icon: "pulse-outline" as const,
          iconColor: "#60a5fa",
        },
        {
          label: "Tokens",
          value: fmt(summary.current.input_tokens + summary.current.output_tokens),
          ...pctChange(
            summary.current.input_tokens + summary.current.output_tokens,
            summary.previous.input_tokens + summary.previous.output_tokens,
          ),
          route: "/traces" as const,
          icon: "layers-outline" as const,
          iconColor: "#a78bfa",
        },
        {
          label: "Chi phí",
          value: fmtCost(summary.current.cost),
          ...pctChange(summary.current.cost, summary.previous.cost),
          route: "/traces" as const,
          icon: "wallet-outline" as const,
          iconColor: "#f59e0b",
        },
        {
          label: "Lỗi",
          value: fmt(summary.current.errors),
          ...pctChange(summary.current.errors, summary.previous.errors),
          route: "/traces" as const,
          icon: "alert-circle-outline" as const,
          iconColor: "#ef4444",
        },
      ]
    : [
        { label: "Requests", value: "1,247", text: "+18%", up: true, route: "/traces" as const, icon: "pulse-outline" as const, iconColor: "#60a5fa" },
        { label: "Tokens", value: "4.2M", text: "+8%", up: true, route: "/traces" as const, icon: "layers-outline" as const, iconColor: "#a78bfa" },
        { label: "Chi phí", value: "$2.40", text: "-12%", up: false, route: "/traces" as const, icon: "wallet-outline" as const, iconColor: "#f59e0b" },
        { label: "Agents", value: `${activeAgents || 6}/${agents.length || 8}`, text: `${errorAgents || 0} lỗi`, up: errorAgents === 0 ? true : null, route: "/agents" as const, icon: "hardware-chip-outline" as const, iconColor: "#22c55e" },
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

  const { events: liveEvents } = useEvents();
  const costData = timeseries.length > 0
    ? timeseries.slice(-7).map((p) => (p as unknown as Record<string, number>).cost ?? 0)
    : [0.12, 0.25, 0.18, 0.34, 0.28, 0.41, 0.38];
  const costMax = Math.max(...costData, 0.01);

  const lastUpdated = loading ? "Đang tải..." : summary ? "Vừa cập nhật" : "Demo data";

  const displayAgents = agents.length > 0 ? agents.slice(0, 6) : [
    { id: "1", display_name: "Sales Bot", status: "active", agent_key: "sales" },
    { id: "2", display_name: "Code Expert", status: "active", agent_key: "coder" },
    { id: "3", display_name: "Researcher", status: "idle", agent_key: "research" },
    { id: "4", display_name: "Writer", status: "idle", agent_key: "writer" },
    { id: "5", display_name: "Support", status: "error", agent_key: "support" },
    { id: "6", display_name: "Analyst", status: "active", agent_key: "analyst" },
  ];

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

      {/* System Alert Banners */}
      {pendingCount > 0 && (
        <TouchableOpacity
          style={[styles.alertBanner, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "40" }]}
          activeOpacity={0.8}
          onPress={() => router.push("/approvals")}
        >
          <View style={[styles.alertDot, { backgroundColor: colors.primary }]} />
          <View style={styles.alertBody}>
            <Text style={[styles.alertTitle, { color: colors.primary }]}>
              {pendingCount} tool execution chờ duyệt
            </Text>
            <Text style={[styles.alertSub, { color: colors.mutedForeground }]}>Nhấn để review và approve/deny</Text>
          </View>
          <Ionicons name="chevron-forward" size={14} color={colors.primary} />
        </TouchableOpacity>
      )}
      {errorAgents > 0 && (
        <TouchableOpacity
          style={[styles.alertBanner, { backgroundColor: "#ef444415", borderColor: "#ef444440" }]}
          activeOpacity={0.8}
          onPress={() => router.push("/agents")}
        >
          <View style={[styles.alertDot, { backgroundColor: "#ef4444" }]} />
          <View style={styles.alertBody}>
            <Text style={[styles.alertTitle, { color: "#ef4444" }]}>{errorAgents} agent đang có lỗi</Text>
            <Text style={[styles.alertSub, { color: colors.mutedForeground }]}>Kiểm tra trạng thái agents</Text>
          </View>
          <Ionicons name="chevron-forward" size={14} color="#ef4444" />
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

      {/* Stat cards — actionable with View → */}
      <View style={styles.statsGrid}>
        {stats.map((stat) => (
          <TouchableOpacity
            key={stat.label}
            style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            activeOpacity={0.8}
            onPress={() => router.push(stat.route)}
          >
            <View style={styles.statTop}>
              <View style={[styles.statIconWrap, { backgroundColor: stat.iconColor + "18" }]}>
                <Ionicons name={stat.icon} size={14} color={stat.iconColor} />
              </View>
              <Ionicons name="chevron-forward" size={12} color={colors.mutedForeground} />
            </View>
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
          </TouchableOpacity>
        ))}
      </View>

      {/* Quota Usage Widget */}
      {(connected && quota) || !connected ? (
        <TouchableOpacity
          style={[styles.quotaCard, {
            backgroundColor: colors.card,
            borderColor: isOverLimit ? "#ef444440" : isNearLimit ? "#f59e0b40" : colors.border,
          }]}
          onPress={() => router.push("/(tabs)/more" as Parameters<typeof router.push>[0])}
          activeOpacity={0.8}
        >
          <View style={styles.quotaHeader}>
            <View style={styles.quotaLeft}>
              <Ionicons name="speedometer-outline" size={14} color={isOverLimit ? "#ef4444" : isNearLimit ? "#f59e0b" : colors.primary} />
              <Text style={[styles.quotaTitle, { color: colors.foreground }]}>Quota Tháng Này</Text>
            </View>
            <Text style={[styles.quotaPct, { color: isOverLimit ? "#ef4444" : isNearLimit ? "#f59e0b" : colors.primary }]}>
              {quota ? `${usagePercent}%` : "—"}
            </Text>
          </View>
          <View style={[styles.quotaTrack, { backgroundColor: colors.secondary }]}>
            <View style={[styles.quotaFill, {
              width: `${Math.min(usagePercent, 100)}%` as unknown as number,
              backgroundColor: isOverLimit ? "#ef4444" : isNearLimit ? "#f59e0b" : colors.primary,
            }]} />
          </View>
          <View style={styles.quotaMeta}>
            <Text style={[styles.quotaMetaText, { color: colors.mutedForeground }]}>
              {quota ? `${fmt(quota.total_used)} / ${fmt(quota.total_limit)} requests` : "Kết nối để xem quota"}
            </Text>
            {quota?.reset_at && (
              <Text style={[styles.quotaMetaText, { color: colors.mutedForeground }]}>
                Reset: {new Date(quota.reset_at).toLocaleDateString("vi")}
              </Text>
            )}
          </View>
          {isNearLimit && !isOverLimit && (
            <View style={[styles.quotaWarn, { backgroundColor: "#f59e0b15" }]}>
              <Ionicons name="warning-outline" size={11} color="#f59e0b" />
              <Text style={{ fontSize: 11, color: "#f59e0b", fontFamily: "Inter_400Regular" }}>
                Sắp đạt giới hạn — liên hệ admin để nâng quota
              </Text>
            </View>
          )}
          {isOverLimit && (
            <View style={[styles.quotaWarn, { backgroundColor: "#ef444415" }]}>
              <Ionicons name="alert-circle-outline" size={11} color="#ef4444" />
              <Text style={{ fontSize: 11, color: "#ef4444", fontFamily: "Inter_400Regular" }}>
                Đã vượt giới hạn — requests có thể bị từ chối
              </Text>
            </View>
          )}
        </TouchableOpacity>
      ) : null}

      {/* Agent Health Grid */}
      <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Agent Health</Text>
          <TouchableOpacity onPress={() => router.push("/agents")} activeOpacity={0.7}>
            <Text style={[styles.viewAll, { color: colors.primary }]}>Xem tất cả →</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.agentHealthGrid}>
          {displayAgents.map((agent) => {
            const statusColor = AGENT_STATUS_COLOR[agent.status ?? "idle"] ?? "#a1a1aa";
            return (
              <TouchableOpacity
                key={agent.id}
                style={[styles.agentHealthCard, { backgroundColor: colors.secondary, borderColor: statusColor + "40" }]}
                activeOpacity={0.8}
                onPress={() => router.push(`/agent/${agent.id}`)}
              >
                <View style={[styles.agentHealthDot, { backgroundColor: statusColor }]} />
                <Text style={[styles.agentHealthName, { color: colors.foreground }]} numberOfLines={1}>
                  {agent.display_name}
                </Text>
                <Text style={[styles.agentHealthStatus, { color: statusColor }]}>
                  {agent.status ?? "idle"}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={styles.agentHealthSummaryRow}>
          <View style={styles.agentHealthStat}>
            <View style={[styles.agentHealthStatDot, { backgroundColor: "#22c55e" }]} />
            <Text style={[styles.agentHealthStatText, { color: colors.mutedForeground }]}>{activeAgents || 3} active</Text>
          </View>
          <View style={styles.agentHealthStat}>
            <View style={[styles.agentHealthStatDot, { backgroundColor: "#60a5fa" }]} />
            <Text style={[styles.agentHealthStatText, { color: colors.mutedForeground }]}>{idleAgents || 2} idle</Text>
          </View>
          <View style={styles.agentHealthStat}>
            <View style={[styles.agentHealthStatDot, { backgroundColor: "#ef4444" }]} />
            <Text style={[styles.agentHealthStatText, { color: colors.mutedForeground }]}>{errorAgents || 1} error</Text>
          </View>
        </View>
      </View>

      {/* Request chart */}
      <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.chartHeader}>
          <Text style={[styles.chartTitle, { color: colors.foreground }]}>
            Requests — {PERIOD_LABELS[period]}
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

      {/* Cost Trend Sparkline */}
      <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.chartHeader}>
          <Text style={[styles.chartTitle, { color: colors.foreground }]}>Chi phí 7 ngày</Text>
          <TouchableOpacity onPress={() => router.push("/traces")} activeOpacity={0.7}>
            <Text style={[styles.viewAll, { color: colors.primary }]}>Xem traces →</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.sparklineWrap}>
          {costData.map((v, i) => (
            <View key={i} style={styles.sparkBarWrap}>
              <View
                style={[
                  styles.sparkBar,
                  {
                    height: `${Math.round((v / costMax) * 100)}%` as unknown as number,
                    backgroundColor: i === costData.length - 1 ? "#f59e0b" : "#f59e0b50",
                    borderRadius: 3,
                  },
                ]}
              />
            </View>
          ))}
        </View>
        <View style={styles.sparkLegend}>
          <Text style={[styles.sparkMin, { color: colors.mutedForeground }]}>
            Min ${Math.min(...costData).toFixed(2)}
          </Text>
          <Text style={[styles.sparkCurrent, { color: "#f59e0b" }]}>
            Hôm nay ${costData[costData.length - 1].toFixed(2)}
          </Text>
          <Text style={[styles.sparkMax, { color: colors.mutedForeground }]}>
            Max ${Math.max(...costData).toFixed(2)}
          </Text>
        </View>
      </View>

      {/* Recent Activity Feed */}
      <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Hoạt động gần đây</Text>
          <TouchableOpacity onPress={() => router.push("/events")} activeOpacity={0.7}>
            <Text style={[styles.viewAll, { color: colors.primary }]}>Xem tất cả →</Text>
          </TouchableOpacity>
        </View>
        {(liveEvents.length > 0 ? liveEvents.slice(0, 5) : MOCK_ACTIVITY).map((item, i, arr) => {
          const isLive = liveEvents.length > 0;
          const id = isLive ? (item as typeof liveEvents[0]).id : (item as typeof MOCK_ACTIVITY[0]).id;
          const text = isLive ? (item as typeof liveEvents[0]).summary : (item as typeof MOCK_ACTIVITY[0]).text;
          const timeVal = isLive
            ? (() => { const d = Date.now() - (item as typeof liveEvents[0]).timestamp; return d < 60000 ? "vừa xong" : d < 3600000 ? `${Math.floor(d / 60000)}m` : `${Math.floor(d / 3600000)}h`; })()
            : (item as typeof MOCK_ACTIVITY[0]).time;
          const status = isLive ? (item as typeof liveEvents[0]).status : undefined;
          const iconColor = status === "error" ? "#ef4444" : status === "running" ? "#60a5fa" : "#22c55e";
          const iconName = (status === "error" ? "alert-circle-outline" : status === "running" ? "sync-outline" : "checkmark-circle-outline") as keyof typeof Ionicons["glyphMap"];
          return (
            <View key={id} style={[styles.activityRow, { borderBottomColor: colors.border }, i === arr.length - 1 && { borderBottomWidth: 0 }]}>
              <View style={[styles.activityIcon, { backgroundColor: (isLive ? iconColor : (item as typeof MOCK_ACTIVITY[0]).color) + "18" }]}>
                <Ionicons name={isLive ? iconName as keyof typeof Ionicons["glyphMap"] : (item as typeof MOCK_ACTIVITY[0]).icon} size={14} color={isLive ? iconColor : (item as typeof MOCK_ACTIVITY[0]).color} />
              </View>
              <Text style={[styles.activityText, { color: colors.foreground }]} numberOfLines={1}>{text}</Text>
              <Text style={[styles.activityTime, { color: colors.mutedForeground }]}>{timeVal}</Text>
            </View>
          );
        })}
      </View>

      {/* Extra stats from summary */}
      {summary && (
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, marginBottom: 10 }]}>Chi tiết</Text>
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
      <Text style={[styles.quickActionsTitle, { color: colors.mutedForeground }]}>TRUY CẬP NHANH</Text>
      <View style={styles.quickActions}>
        {[
          { icon: "search-outline" as const, label: "Traces", onPress: () => router.push("/traces"), color: "#60a5fa" },
          { icon: "heart-outline" as const, label: "Health", onPress: () => router.push("/health"), color: "#22c55e" },
          { icon: "flash-outline" as const, label: "Skills", onPress: () => router.push("/skills"), color: "#f59e0b" },
          { icon: "shield-outline" as const, label: "Approvals", badge: pendingCount, onPress: () => router.push("/approvals"), color: "#f97316" },
          { icon: "chatbubbles-outline" as const, label: "Sessions", onPress: () => router.push("/sessions"), color: "#a78bfa" },
          { icon: "cube-outline" as const, label: "Packages", onPress: () => router.push("/packages"), color: "#3b82f6" },
        ].map((a) => (
          <TouchableOpacity
            key={a.label}
            style={[styles.quickBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            activeOpacity={0.7}
            onPress={a.onPress}
          >
            <View style={[styles.quickIcon, { backgroundColor: a.color + "18" }]}>
              <Ionicons name={a.icon} size={18} color={a.color} />
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
  alertBanner: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
    gap: 10,
  },
  alertDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  alertBody: { flex: 1 },
  alertTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  alertSub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  periodRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
  periodBtn: { flex: 1, paddingVertical: 7, borderRadius: 10, borderWidth: 1, alignItems: "center" },
  periodBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 14 },
  statCard: { width: "47.5%", borderRadius: 16, borderWidth: 1, padding: 14 },
  statTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  statIconWrap: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  statLabel: { fontSize: 11, fontFamily: "Inter_500Medium", marginBottom: 4 },
  statValue: { fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  statChangeRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  statChange: { fontSize: 11, fontFamily: "Inter_500Medium" },
  quotaCard: { borderRadius: 18, borderWidth: 1, padding: 14, marginBottom: 14, gap: 8 },
  quotaHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  quotaLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  quotaTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  quotaPct: { fontSize: 15, fontFamily: "Inter_700Bold" },
  quotaTrack: { height: 6, borderRadius: 3, overflow: "hidden" },
  quotaFill: { height: 6, borderRadius: 3 },
  quotaMeta: { flexDirection: "row", justifyContent: "space-between" },
  quotaMetaText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  quotaWarn: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 },
  sectionCard: { borderRadius: 18, borderWidth: 1, padding: 16, marginBottom: 14 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  sectionTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  viewAll: { fontSize: 12, fontFamily: "Inter_500Medium" },
  agentHealthGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  agentHealthCard: { width: "30.5%", borderRadius: 12, borderWidth: 1, padding: 10, alignItems: "flex-start", gap: 4 },
  agentHealthDot: { width: 8, height: 8, borderRadius: 4 },
  agentHealthName: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  agentHealthStatus: { fontSize: 9, fontFamily: "Inter_500Medium", textTransform: "capitalize" },
  agentHealthSummaryRow: { flexDirection: "row", gap: 14, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#27272a" },
  agentHealthStat: { flexDirection: "row", alignItems: "center", gap: 5 },
  agentHealthStatDot: { width: 6, height: 6, borderRadius: 3 },
  agentHealthStatText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  chartCard: { borderRadius: 18, borderWidth: 1, padding: 16, marginBottom: 14 },
  chartHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 },
  chartTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  chartSubtitle: { fontSize: 11, fontFamily: "Inter_400Regular" },
  bars: { flexDirection: "row", alignItems: "flex-end", height: 80, gap: 4, marginBottom: 6 },
  barWrap: { flex: 1, height: "100%", justifyContent: "flex-end" },
  bar: { width: "100%" },
  barLabels: { flexDirection: "row", gap: 4 },
  barLabel: { flex: 1, fontSize: 9, fontFamily: "Inter_400Regular", textAlign: "center" },
  sparklineWrap: { flexDirection: "row", alignItems: "flex-end", height: 60, gap: 3, marginBottom: 8 },
  sparkBarWrap: { flex: 1, height: "100%", justifyContent: "flex-end" },
  sparkBar: { width: "100%" },
  sparkLegend: { flexDirection: "row", justifyContent: "space-between" },
  sparkMin: { fontSize: 10, fontFamily: "Inter_400Regular" },
  sparkCurrent: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  sparkMax: { fontSize: 10, fontFamily: "Inter_400Regular" },
  activityRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth },
  activityIcon: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  activityText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular" },
  activityTime: { fontSize: 11, fontFamily: "Inter_400Regular" },
  extraRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  extraLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  extraValue: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  quickActionsTitle: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5, marginBottom: 10, marginTop: 2 },
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
