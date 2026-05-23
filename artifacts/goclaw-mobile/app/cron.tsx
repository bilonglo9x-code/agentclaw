import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useCron, CronJob } from "@/hooks/useCron";
import * as Haptics from "expo-haptics";
import { SearchBar } from "@/components/SearchBar";

const MOCK_JOBS: CronJob[] = [
  {
    id: "cj1", name: "Daily Report", agentId: "reporter", enabled: true,
    schedule: { kind: "cron", expr: "0 8 * * *", tz: "Asia/Ho_Chi_Minh" },
    payload: { kind: "message", message: "Tạo báo cáo hàng ngày" },
    state: { nextRunAtMs: Date.now() + 3600000 * 14, lastRunAtMs: Date.now() - 86400000, lastStatus: "ok", lastDurationMs: 4200 },
    createdAtMs: Date.now() - 86400000 * 30, updatedAtMs: Date.now() - 86400000,
  },
  {
    id: "cj2", name: "Memory Consolidation", agentId: "assistant", enabled: true,
    schedule: { kind: "every", everyMs: 3600000 },
    payload: { kind: "command", message: "consolidate", command: "memory.consolidate" },
    state: { nextRunAtMs: Date.now() + 1800000, lastRunAtMs: Date.now() - 1800000, lastStatus: "ok", lastDurationMs: 1200 },
    createdAtMs: Date.now() - 86400000 * 60, updatedAtMs: Date.now() - 86400000 * 2,
  },
  {
    id: "cj3", name: "Weekly Sync", agentId: "sync-agent", enabled: false,
    schedule: { kind: "cron", expr: "0 9 * * 1" },
    payload: { kind: "message", message: "Đồng bộ dữ liệu tuần" },
    state: { lastRunAtMs: Date.now() - 86400000 * 7, lastStatus: "ok", lastDurationMs: 8500 },
    createdAtMs: Date.now() - 86400000 * 14, updatedAtMs: Date.now() - 86400000 * 7,
  },
  {
    id: "cj4", name: "Health Check", agentId: "monitor", enabled: true,
    schedule: { kind: "every", everyMs: 300000 },
    payload: { kind: "command", message: "health check", command: "system.health" },
    state: { nextRunAtMs: Date.now() + 120000, lastRunAtMs: Date.now() - 180000, lastStatus: "error", lastError: "Provider timeout" },
    createdAtMs: Date.now() - 86400000 * 5, updatedAtMs: Date.now() - 86400000,
  },
];

function fmtSchedule(job: CronJob): string {
  const s = job.schedule;
  if (s.kind === "cron") return s.expr ?? "cron";
  if (s.kind === "every") {
    const ms = s.everyMs ?? 0;
    if (ms >= 3600000) return `Mỗi ${ms / 3600000}h`;
    if (ms >= 60000) return `Mỗi ${ms / 60000}m`;
    return `Mỗi ${ms / 1000}s`;
  }
  if (s.kind === "at" && s.atMs) return new Date(s.atMs).toLocaleString("vi");
  return "—";
}

function fmtNextRun(ms?: number): string {
  if (!ms) return "—";
  const diff = ms - Date.now();
  if (diff < 0) return "Overdue";
  if (diff < 60000) return `${Math.floor(diff / 1000)}s`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  return `${Math.floor(diff / 86400000)}d`;
}

function fmtLastRun(ms?: number): string {
  if (!ms) return "Chưa chạy";
  const diff = Date.now() - ms;
  if (diff < 60000) return "Vừa xong";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m trước`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h trước`;
  return `${Math.floor(diff / 86400000)}d trước`;
}

function fmtDuration(ms?: number): string {
  if (!ms) return "";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m${Math.floor((ms % 60000) / 1000)}s`;
}

function getIntervalMs(job: CronJob): number {
  if (job.schedule.kind === "every") return job.schedule.everyMs ?? 0;
  if (job.schedule.kind === "cron") {
    const expr = job.schedule.expr ?? "";
    if (expr.startsWith("0 * ")) return 3600000;
    if (expr.startsWith("0 8 * * *")) return 86400000;
    if (expr.includes("* * 1")) return 86400000 * 7;
    return 86400000;
  }
  return 0;
}

export default function CronScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { jobs: liveJobs, loading, error, toggle, run, refresh } = useCron();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "enabled" | "disabled" | "error">("all");

  const allJobs = liveJobs.length > 0 ? liveJobs : MOCK_JOBS;
  const jobs = useMemo(() => {
    let list = allJobs;
    if (statusFilter === "enabled") list = list.filter((j) => j.enabled);
    else if (statusFilter === "disabled") list = list.filter((j) => !j.enabled);
    else if (statusFilter === "error") list = list.filter((j) => j.state?.lastStatus === "error");
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((j) => j.name.toLowerCase().includes(q) || (j.agentId ?? "").toLowerCase().includes(q));
    }
    return list;
  }, [allJobs, search, statusFilter]);

  const activeCount = allJobs.filter((j) => j.enabled).length;
  const errorCount = allJobs.filter((j) => j.state?.lastStatus === "error").length;

  const handleCreate = () => {
    Alert.alert("Tạo Cron Job", "Mở web console để tạo cron job mới?\n\nHoặc dùng WS method: cron.create", [
      { text: "Hủy", style: "cancel" },
      { text: "Mở Console", onPress: () => {} },
    ]);
  };

  const handleRun = (job: CronJob) => {
    Alert.alert(
      "Chạy ngay",
      `Bạn có muốn chạy "${job.name}" ngay bây giờ?`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Chạy",
          onPress: async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            await run(job.id);
          },
        },
      ],
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 4 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>Cron Jobs</Text>
        <TouchableOpacity
          onPress={handleCreate}
          style={[styles.iconBtn, { backgroundColor: colors.primary + "20" }]}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={18} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={refresh} style={[styles.iconBtn, { backgroundColor: colors.muted }]} activeOpacity={0.7}>
          {loading ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="refresh-outline" size={15} color={colors.mutedForeground} />}
        </TouchableOpacity>
      </View>

      {/* Search bar */}
      <View style={styles.searchWrap}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Tìm cron job..." />
      </View>

      {/* Status filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterRow}>
        {(["all", "enabled", "disabled", "error"] as const).map((f) => {
          const active = statusFilter === f;
          const colors2 = f === "error" ? "#ef4444" : f === "enabled" ? "#22c55e" : f === "disabled" ? "#71717a" : colors.primary;
          const label = f === "all" ? "Tất cả" : f === "enabled" ? "Active" : f === "disabled" ? "Paused" : "Error";
          return (
            <TouchableOpacity
              key={f}
              onPress={() => setStatusFilter(f)}
              style={[styles.filterChip, { backgroundColor: active ? colors2 + "20" : colors.muted, borderColor: active ? colors2 + "50" : colors.border }]}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterChipText, { color: active ? colors2 : colors.mutedForeground }]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sumCount, { color: "#22c55e" }]}>{activeCount}</Text>
          <Text style={[styles.sumLabel, { color: colors.mutedForeground }]}>Active</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sumCount, { color: colors.foreground }]}>{jobs.length}</Text>
          <Text style={[styles.sumLabel, { color: colors.mutedForeground }]}>Total</Text>
        </View>
        {errorCount > 0 && (
          <View style={[styles.summaryCard, { backgroundColor: "#ef444415", borderColor: "#ef444430" }]}>
            <Text style={[styles.sumCount, { color: "#ef4444" }]}>{errorCount}</Text>
            <Text style={[styles.sumLabel, { color: "#ef4444" }]}>Errors</Text>
          </View>
        )}
      </View>

      {error && (
        <View style={[styles.errorBanner, { backgroundColor: colors.destructive + "15" }]}>
          <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
        </View>
      )}

      <FlatList
        data={jobs}
        keyExtractor={(j) => j.id}
        renderItem={({ item }) => {
          const hasError = item.state?.lastStatus === "error";
          const intervalMs = getIntervalMs(item);
          const lastRunMs = item.state?.lastRunAtMs;
          const nextRunMs = item.state?.nextRunAtMs;
          const elapsed = lastRunMs ? Date.now() - lastRunMs : 0;
          const progressPct = intervalMs > 0 && lastRunMs ? Math.min(elapsed / intervalMs, 1) : 0;

          return (
            <View style={[styles.jobCard, { backgroundColor: colors.card, borderColor: hasError ? "#ef444430" : colors.border }]}>
              <View style={styles.jobTop}>
                <View style={[styles.jobIcon, { backgroundColor: item.enabled ? colors.primary + "20" : colors.muted }]}>
                  <Ionicons name="time-outline" size={18} color={item.enabled ? colors.primary : colors.mutedForeground} />
                </View>
                <View style={styles.jobInfo}>
                  <Text style={[styles.jobName, { color: colors.foreground }]}>{item.name}</Text>
                  <Text style={[styles.scheduleText, { color: colors.mutedForeground }]}>
                    {fmtSchedule(item)}{item.schedule.tz ? ` (${item.schedule.tz})` : ""}
                  </Text>
                </View>
                <View style={styles.jobTopRight}>
                  {/* Last run result badge */}
                  {item.state?.lastStatus && (
                    <View style={[styles.resultBadge, { backgroundColor: hasError ? "#ef444418" : "#22c55e18" }]}>
                      <Ionicons
                        name={hasError ? "close-circle" : "checkmark-circle"}
                        size={11}
                        color={hasError ? "#ef4444" : "#22c55e"}
                      />
                      <Text style={[styles.resultText, { color: hasError ? "#ef4444" : "#22c55e" }]}>
                        {hasError ? "Error" : "OK"}
                      </Text>
                    </View>
                  )}
                  <Switch
                    value={item.enabled}
                    onValueChange={(v) => toggle(item.id, v)}
                    trackColor={{ true: colors.primary, false: colors.muted }}
                    thumbColor="#fff"
                    ios_backgroundColor={colors.muted}
                  />
                </View>
              </View>

              {/* Next run countdown bar */}
              {item.enabled && intervalMs > 0 && progressPct > 0 && (
                <View style={styles.countdownRow}>
                  <View style={[styles.countdownTrack, { backgroundColor: colors.secondary }]}>
                    <View style={[styles.countdownFill, { width: `${progressPct * 100}%`, backgroundColor: hasError ? "#ef4444" : colors.primary }]} />
                  </View>
                  <Text style={[styles.countdownLabel, { color: colors.mutedForeground }]}>
                    {nextRunMs ? `lần tới: ${fmtNextRun(nextRunMs)}` : fmtLastRun(lastRunMs)}
                  </Text>
                </View>
              )}

              {item.agentId && (
                <View style={[styles.agentRow, { borderTopColor: colors.border }]}>
                  <Ionicons name="planet-outline" size={12} color={colors.mutedForeground} />
                  <Text style={[styles.agentText, { color: colors.mutedForeground }]}>{item.agentId}</Text>
                  {item.state?.lastDurationMs != null && (
                    <>
                      <Text style={[styles.agentText, { color: colors.border }]}>·</Text>
                      <Ionicons name="hourglass-outline" size={11} color={colors.mutedForeground} />
                      <Text style={[styles.agentText, { color: colors.mutedForeground }]}>{fmtDuration(item.state.lastDurationMs)}</Text>
                    </>
                  )}
                </View>
              )}

              <View style={[styles.statsRow, { borderTopColor: colors.border }]}>
                <View style={styles.statItem}>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Lần tới</Text>
                  <Text style={[styles.statValue, { color: item.enabled ? colors.primary : colors.mutedForeground }]}>
                    {item.enabled ? fmtNextRun(item.state?.nextRunAtMs) : "Paused"}
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Lần cuối</Text>
                  <Text style={[styles.statValue, { color: hasError ? "#ef4444" : colors.foreground }]}>
                    {fmtLastRun(item.state?.lastRunAtMs)}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.runBtn, { backgroundColor: colors.primary + "20", borderColor: colors.primary + "40" }]}
                  onPress={() => handleRun(item)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="play-outline" size={13} color={colors.primary} />
                  <Text style={[styles.runBtnText, { color: colors.primary }]}>Run</Text>
                </TouchableOpacity>
              </View>

              {hasError && item.state?.lastError && (
                <View style={[styles.errorRow, { borderTopColor: colors.border, backgroundColor: "#ef444408" }]}>
                  <Ionicons name="alert-circle-outline" size={12} color="#ef4444" />
                  <Text style={[styles.errorMsg, { color: "#ef4444" }]} numberOfLines={1}>
                    {item.state.lastError}
                  </Text>
                </View>
              )}
            </View>
          );
        }}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="time-outline" size={36} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Không có cron jobs</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingBottom: 10, gap: 8 },
  backBtn: { padding: 4 },
  title: { flex: 1, fontSize: 20, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  iconBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  searchWrap: { paddingHorizontal: 14, paddingBottom: 6 },
  filterScroll: { flexGrow: 0, flexShrink: 0 },
  filterRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingBottom: 8, gap: 7 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  filterChipText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  summaryRow: { flexDirection: "row", gap: 10, paddingHorizontal: 16, marginBottom: 12 },
  summaryCard: { flex: 1, borderRadius: 14, borderWidth: 1, padding: 12, alignItems: "center" },
  sumCount: { fontSize: 20, fontFamily: "Inter_700Bold" },
  sumLabel: { fontSize: 11, fontFamily: "Inter_500Medium", marginTop: 2 },
  errorBanner: { marginHorizontal: 16, marginBottom: 8, borderRadius: 10, padding: 10 },
  errorText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  list: { paddingHorizontal: 14, paddingTop: 4 },
  jobCard: { borderRadius: 18, borderWidth: 1, overflow: "hidden" },
  jobTop: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  jobIcon: { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  jobInfo: { flex: 1 },
  jobName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  scheduleText: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  jobTopRight: { flexDirection: "column", alignItems: "flex-end", gap: 6 },
  resultBadge: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  resultText: { fontSize: 10, fontFamily: "Inter_700Bold" },
  countdownRow: { paddingHorizontal: 14, paddingBottom: 8, gap: 4 },
  countdownTrack: { height: 4, borderRadius: 2, overflow: "hidden" },
  countdownFill: { height: 4, borderRadius: 2 },
  countdownLabel: { fontSize: 9, fontFamily: "Inter_400Regular", textAlign: "right" },
  agentRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 7, borderTopWidth: StyleSheet.hairlineWidth },
  agentText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  statsRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, gap: 14 },
  statItem: { gap: 2 },
  statLabel: { fontSize: 10, fontFamily: "Inter_400Regular" },
  statValue: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  runBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1, marginLeft: "auto" },
  runBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  errorRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 7, borderTopWidth: StyleSheet.hairlineWidth },
  errorMsg: { fontSize: 11, fontFamily: "Inter_400Regular", flex: 1 },
  emptyWrap: { alignItems: "center", paddingTop: 80, gap: 10 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
});
