import React from "react";
import {
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

const STATS = [
  { label: "Requests hôm nay", value: "1,247", change: "+18%", up: true },
  { label: "Tokens dùng", value: "4.2M", change: "+8%", up: true },
  { label: "Agents active", value: "6/8", change: "2 idle", up: null },
  { label: "Chi phí hôm nay", value: "$2.40", change: "-12%", up: false },
];

const BAR_HEIGHTS = [40, 65, 55, 80, 70, 90, 85];
const BAR_LABELS = ["Th2", "Th3", "Th4", "Th5", "Th6", "Th7", "Hôm nay"];

const ACTIVITY = [
  { icon: "chatbubble-outline" as const, text: "Sales Assistant hoàn thành phân tích", time: "2m", running: false },
  { icon: "settings-outline" as const, text: "Skill 'data_query' được invoke", time: "5m", running: false },
  { icon: "sync-outline" as const, text: "Memory consolidation đang chạy", time: "12m", running: true },
  { icon: "mail-outline" as const, text: "Email channel nhận 3 tin mới", time: "15m", running: false },
];

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: topPad + 8, paddingBottom: insets.bottom + 110 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.foreground }]}>Dashboard</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Cập nhật 30s trước</Text>
        </View>
        <View style={styles.liveRow}>
          <View style={[styles.liveDot, { backgroundColor: colors.success }]} />
          <Text style={[styles.liveText, { color: colors.success }]}>Live</Text>
        </View>
      </View>

      {/* Alert banner */}
      <View style={[styles.alert, { backgroundColor: colors.warning + "15", borderColor: colors.warning + "40" }]}>
        <Ionicons name="warning-outline" size={16} color={colors.warning} style={styles.alertIcon} />
        <View style={styles.alertBody}>
          <Text style={[styles.alertTitle, { color: colors.warning }]}>Embedding provider lỗi</Text>
          <Text style={[styles.alertSub, { color: colors.mutedForeground }]}>Provider "openai" không phản hồi · 3 phút trước</Text>
        </View>
        <TouchableOpacity activeOpacity={0.7}>
          <Text style={[styles.alertAction, { color: colors.warning }]}>Fix</Text>
        </TouchableOpacity>
      </View>

      {/* Stat cards */}
      <View style={styles.statsGrid}>
        {STATS.map((stat) => (
          <View
            key={stat.label}
            style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{stat.label}</Text>
            <Text style={[styles.statValue, { color: colors.foreground }]}>{stat.value}</Text>
            <View style={styles.statChangeRow}>
              {stat.up !== null && (
                <Text style={{ color: stat.up ? colors.success : colors.destructive, fontSize: 11 }}>
                  {stat.up ? "↑ " : "↓ "}
                </Text>
              )}
              <Text
                style={[
                  styles.statChange,
                  {
                    color: stat.up === true ? colors.success : stat.up === false ? colors.destructive : colors.mutedForeground,
                  },
                ]}
              >
                {stat.change}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* Sparkline */}
      <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.chartHeader}>
          <Text style={[styles.chartTitle, { color: colors.foreground }]}>Requests 7 ngày</Text>
          <View style={styles.timeFilters}>
            {["7d", "30d", "90d"].map((t, i) => (
              <TouchableOpacity
                key={t}
                style={[
                  styles.timeBtn,
                  { backgroundColor: i === 0 ? colors.primary + "25" : "transparent" },
                ]}
              >
                <Text style={[styles.timeBtnText, { color: i === 0 ? colors.primary : colors.mutedForeground }]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View style={styles.bars}>
          {BAR_HEIGHTS.map((h, i) => (
            <View key={i} style={styles.barWrap}>
              <View
                style={[
                  styles.bar,
                  {
                    height: `${h}%` as any,
                    backgroundColor: i === BAR_HEIGHTS.length - 1 ? colors.primary : colors.primary + "40",
                    borderRadius: 4,
                  },
                ]}
              />
            </View>
          ))}
        </View>
        <View style={styles.barLabels}>
          {BAR_LABELS.map((l) => (
            <Text key={l} style={[styles.barLabel, { color: colors.mutedForeground }]}>{l}</Text>
          ))}
        </View>
      </View>

      {/* Recent activity */}
      <View style={[styles.activityCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.activityHeader, { borderBottomColor: colors.border }]}>
          <Text style={[styles.activityTitle, { color: colors.foreground }]}>Hoạt động gần đây</Text>
          <TouchableOpacity activeOpacity={0.7}>
            <Text style={[styles.seeAll, { color: colors.primary }]}>Xem tất cả</Text>
          </TouchableOpacity>
        </View>
        {ACTIVITY.map((item, i) => (
          <View
            key={i}
            style={[
              styles.activityRow,
              { borderBottomColor: colors.border },
              i === ACTIVITY.length - 1 && styles.noBorder,
            ]}
          >
            <Ionicons name={item.icon} size={18} color={colors.mutedForeground} />
            <Text style={[styles.activityText, { color: colors.foreground }]} numberOfLines={1}>
              {item.text}
            </Text>
            <View style={styles.activityMeta}>
              {item.running && (
                <View style={[styles.runningDot, { backgroundColor: colors.primary }]} />
              )}
              <Text style={[styles.activityTime, { color: colors.mutedForeground }]}>{item.time}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Quick actions */}
      <View style={styles.quickActions}>
        {[
          { icon: "search-outline" as const, label: "Traces" },
          { icon: "radio-outline" as const, label: "Events" },
          { icon: "document-text-outline" as const, label: "Logs" },
        ].map((a) => (
          <TouchableOpacity
            key={a.label}
            style={[styles.quickBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            activeOpacity={0.75}
          >
            <Ionicons name={a.icon} size={22} color={colors.mutedForeground} />
            <Text style={[styles.quickLabel, { color: colors.mutedForeground }]}>{a.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16 },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  subtitle: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  liveRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 6 },
  liveDot: { width: 7, height: 7, borderRadius: 4 },
  liveText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  alert: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 14,
    gap: 10,
  },
  alertIcon: { marginTop: 1 },
  alertBody: { flex: 1 },
  alertTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  alertSub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  alertAction: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  statCard: {
    flex: 1,
    minWidth: "46%",
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 4,
  },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 14 },
  statValue: { fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  statChangeRow: { flexDirection: "row", alignItems: "center" },
  statChange: { fontSize: 11, fontFamily: "Inter_500Medium" },
  chartCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  chartHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  chartTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  timeFilters: { flexDirection: "row", gap: 4 },
  timeBtn: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  timeBtnText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  bars: { flexDirection: "row", alignItems: "flex-end", height: 64, gap: 4 },
  barWrap: { flex: 1, height: "100%", justifyContent: "flex-end" },
  bar: { width: "100%" },
  barLabels: { flexDirection: "row", marginTop: 6 },
  barLabel: { flex: 1, fontSize: 8, fontFamily: "Inter_400Regular", textAlign: "center" },
  activityCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden", marginBottom: 12 },
  activityHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  activityTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  seeAll: { fontSize: 13, fontFamily: "Inter_500Medium" },
  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  noBorder: { borderBottomWidth: 0 },
  activityText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular" },
  activityMeta: { flexDirection: "row", alignItems: "center", gap: 5 },
  runningDot: { width: 6, height: 6, borderRadius: 3 },
  activityTime: { fontSize: 11, fontFamily: "Inter_400Regular" },
  quickActions: { flexDirection: "row", gap: 8 },
  quickBtn: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    alignItems: "center",
    gap: 6,
  },
  quickLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
});
