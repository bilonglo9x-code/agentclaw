import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
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
import { useHeartbeat, HeartbeatTarget } from "@/hooks/useHeartbeat";
import { useAuth } from "@/context/AuthContext";

const MOCK_TARGETS: HeartbeatTarget[] = [
  { id: "hb1", name: "Main API", url: "https://api.goclaw.dev/healthz", method: "GET", interval_seconds: 60, timeout_seconds: 10, enabled: true, last_status: "ok", last_checked_at: new Date(Date.now() - 45000).toISOString(), response_time_ms: 142, uptime_pct: 99.98 },
  { id: "hb2", name: "Embedding Service", url: "https://embed.goclaw.dev/health", method: "GET", interval_seconds: 120, timeout_seconds: 15, enabled: true, last_status: "ok", last_checked_at: new Date(Date.now() - 90000).toISOString(), response_time_ms: 284, uptime_pct: 99.5 },
  { id: "hb3", name: "WhatsApp Bridge", url: "https://wa.goclaw.dev/status", method: "GET", interval_seconds: 60, timeout_seconds: 10, enabled: true, last_status: "error", last_checked_at: new Date(Date.now() - 30000).toISOString(), last_error: "Connection refused", response_time_ms: 0, uptime_pct: 87.3 },
  { id: "hb4", name: "Telegram Bot", url: "https://api.telegram.org/bot{TOKEN}/getMe", method: "GET", interval_seconds: 300, timeout_seconds: 10, enabled: true, last_status: "ok", last_checked_at: new Date(Date.now() - 120000).toISOString(), response_time_ms: 321, uptime_pct: 100 },
  { id: "hb5", name: "Backup S3", url: "https://backup.goclaw.dev/ping", method: "GET", interval_seconds: 600, timeout_seconds: 30, enabled: false, last_status: "unknown", response_time_ms: 0, uptime_pct: 0 },
];

const STATUS_CONFIG: Record<string, { color: string; icon: keyof typeof Ionicons["glyphMap"]; label: string; bg: string }> = {
  ok: { color: "#22c55e", icon: "checkmark-circle", label: "OK", bg: "#22c55e18" },
  error: { color: "#ef4444", icon: "close-circle", label: "Error", bg: "#ef444418" },
  timeout: { color: "#f59e0b", icon: "time", label: "Timeout", bg: "#f59e0b18" },
  unknown: { color: "#71717a", icon: "help-circle", label: "Unknown", bg: "#71717a18" },
};

function getResponseColor(ms: number): string {
  if (ms <= 0) return "#71717a";
  if (ms < 200) return "#22c55e";
  if (ms < 500) return "#f59e0b";
  return "#ef4444";
}

function fmtLastCheck(iso?: string): string {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  return `${Math.floor(diff / 3600000)}h ago`;
}

function fmtInterval(sec: number): string {
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${sec / 60}m`;
  return `${sec / 3600}h`;
}

export default function HealthScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { connected } = useAuth();
  const { config, loading, error, refresh, toggleTarget, testTarget } = useHeartbeat();
  const [testing, setTesting] = useState<string | null>(null);
  const topPad = insets.top;

  const targets = config?.targets ?? [];
  const okCount = targets.filter((t) => t.last_status === "ok").length;
  const errorCount = targets.filter((t) => t.last_status === "error").length;
  const enabledCount = targets.filter((t) => t.enabled).length;

  const handleTest = async (target: HeartbeatTarget) => {
    if (!connected) {
      Alert.alert("Offline", "Kết nối server để test heartbeat.");
      return;
    }
    setTesting(target.id);
    try {
      const result = await testTarget(target.id);
      Alert.alert(
        result.ok ? "✅ Thành công" : "❌ Thất bại",
        result.ok
          ? `Response time: ${result.response_time_ms ?? "—"}ms`
          : `Error: ${result.error ?? "Unknown"}`,
      );
    } finally {
      setTesting(null);
    }
  };

  const handleToggle = async (target: HeartbeatTarget) => {
    if (!connected) return;
    await toggleTarget(target.id, !target.enabled);
  };

  const avgUptime = targets.filter((t) => t.uptime_pct != null && t.uptime_pct! > 0).reduce((sum, t, _, arr) => sum + (t.uptime_pct ?? 0) / arr.length, 0);

  const handleAddTarget = () => {
    Alert.alert(
      "Thêm Health Target",
      "Nhập URL để monitor. Ví dụ:\nhttps://api.example.com/health",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Thêm qua Console",
          onPress: () => Alert.alert("Hướng dẫn", "Dùng web console hoặc WS method:\nheartbeat.add { url, name, interval_seconds }"),
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
        <Text style={[styles.title, { color: colors.foreground }]}>Health Monitor</Text>
        <TouchableOpacity
          onPress={handleAddTarget}
          style={[styles.iconBtn, { backgroundColor: colors.primary + "20" }]}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={18} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={refresh} style={[styles.iconBtn, { backgroundColor: colors.muted }]} activeOpacity={0.7}>
          {loading ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="refresh-outline" size={15} color={colors.mutedForeground} />}
        </TouchableOpacity>
      </View>

      {/* Overall status bar */}
      <View style={[styles.overallBar, {
        backgroundColor: errorCount > 0 ? "#ef444418" : "#22c55e18",
        borderColor: errorCount > 0 ? "#ef444435" : "#22c55e35",
      }]}>
        <Ionicons
          name={errorCount > 0 ? "warning" : "shield-checkmark"}
          size={20}
          color={errorCount > 0 ? "#ef4444" : "#22c55e"}
        />
        <Text style={[styles.overallText, { color: errorCount > 0 ? "#ef4444" : "#22c55e" }]}>
          {errorCount > 0 ? `${errorCount} service có lỗi` : "Tất cả services hoạt động tốt"}
        </Text>
        {avgUptime > 0 && (
          <Text style={[styles.uptimeText, { color: colors.mutedForeground }]}>
            avg {avgUptime.toFixed(1)}% uptime
          </Text>
        )}
      </View>

      {/* Summary row */}
      <View style={styles.summaryRow}>
        <View style={[styles.sumCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sumCount, { color: "#22c55e" }]}>{okCount}</Text>
          <Text style={[styles.sumLabel, { color: colors.mutedForeground }]}>Healthy</Text>
        </View>
        <View style={[styles.sumCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sumCount, { color: "#ef4444" }]}>{errorCount}</Text>
          <Text style={[styles.sumLabel, { color: colors.mutedForeground }]}>Error</Text>
        </View>
        <View style={[styles.sumCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sumCount, { color: colors.foreground }]}>{enabledCount}/{targets.length}</Text>
          <Text style={[styles.sumLabel, { color: colors.mutedForeground }]}>Active</Text>
        </View>
        {avgUptime > 0 && (
          <View style={[styles.sumCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sumCount, { color: avgUptime > 95 ? "#22c55e" : "#f59e0b" }]}>{avgUptime.toFixed(1)}%</Text>
            <Text style={[styles.sumLabel, { color: colors.mutedForeground }]}>Avg Uptime</Text>
          </View>
        )}
      </View>

      {error && (
        <View style={[styles.errorBanner, { backgroundColor: colors.destructive + "15" }]}>
          <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
        </View>
      )}

      <FlatList
        data={targets}
        keyExtractor={(t) => t.id}
        renderItem={({ item }) => {
          const stCfg = STATUS_CONFIG[item.last_status ?? "unknown"] ?? STATUS_CONFIG.unknown;
          const isTesting = testing === item.id;
          const rtColor = getResponseColor(item.response_time_ms ?? 0);
          const uptime = item.uptime_pct ?? 0;
          const uptimeColor = uptime >= 99 ? "#22c55e" : uptime >= 90 ? "#f59e0b" : "#ef4444";

          return (
            <View style={[styles.targetCard, { backgroundColor: colors.card, borderColor: item.last_status === "error" && item.enabled ? "#ef444430" : colors.border }]}>
              <View style={styles.targetTop}>
                <View style={[styles.statusIcon, { backgroundColor: item.enabled ? stCfg.bg : colors.muted }]}>
                  <Ionicons name={stCfg.icon} size={20} color={item.enabled ? stCfg.color : colors.mutedForeground} />
                </View>
                <View style={styles.targetInfo}>
                  <Text style={[styles.targetName, { color: colors.foreground }]}>{item.name}</Text>
                  <Text style={[styles.targetUrl, { color: colors.mutedForeground }]} numberOfLines={1}>{item.url}</Text>
                </View>
                <Switch
                  value={item.enabled}
                  onValueChange={() => handleToggle(item)}
                  trackColor={{ false: colors.muted, true: colors.primary + "60" }}
                  thumbColor={item.enabled ? colors.primary : colors.mutedForeground}
                  ios_backgroundColor={colors.muted}
                />
              </View>

              {/* Uptime progress bar */}
              {item.enabled && uptime > 0 && (
                <View style={styles.uptimeRow}>
                  <Text style={[styles.uptimeLabel, { color: colors.mutedForeground }]}>Uptime</Text>
                  <View style={[styles.uptimeTrack, { backgroundColor: colors.secondary }]}>
                    <View style={[styles.uptimeFill, { width: `${Math.min(uptime, 100)}%`, backgroundColor: uptimeColor }]} />
                  </View>
                  <Text style={[styles.uptimePct, { color: uptimeColor }]}>{uptime.toFixed(1)}%</Text>
                </View>
              )}

              {item.last_status === "error" && item.last_error && (
                <View style={[styles.errorMsg, { backgroundColor: "#ef444412" }]}>
                  <Ionicons name="alert-circle-outline" size={12} color="#ef4444" />
                  <Text style={[styles.errorMsgText, { color: "#ef4444" }]}>{item.last_error}</Text>
                </View>
              )}

              <View style={[styles.targetStats, { borderTopColor: colors.border }]}>
                <View style={styles.statPair}>
                  <Ionicons name="time-outline" size={11} color={colors.mutedForeground} />
                  <Text style={[styles.statText, { color: colors.mutedForeground }]}>{fmtLastCheck(item.last_checked_at)}</Text>
                </View>
                {(item.response_time_ms ?? 0) > 0 && (
                  <View style={[styles.rtBadge, { backgroundColor: rtColor + "18" }]}>
                    <Ionicons name="speedometer-outline" size={11} color={rtColor} />
                    <Text style={[styles.rtText, { color: rtColor }]}>{item.response_time_ms}ms</Text>
                  </View>
                )}
                <View style={styles.statPair}>
                  <Ionicons name="repeat-outline" size={11} color={colors.mutedForeground} />
                  <Text style={[styles.statText, { color: colors.mutedForeground }]}>{fmtInterval(item.interval_seconds)}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleTest(item)}
                  disabled={isTesting}
                  style={[styles.testBtn, { backgroundColor: colors.muted }]}
                  activeOpacity={0.7}
                >
                  {isTesting ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Text style={[styles.testBtnText, { color: colors.primary }]}>Test</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 40 }]}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="heart-outline" size={36} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Không có health targets</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingBottom: 8, gap: 8 },
  backBtn: { padding: 4 },
  title: { flex: 1, fontSize: 20, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  iconBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  overallBar: { flexDirection: "row", alignItems: "center", gap: 10, marginHorizontal: 16, marginBottom: 10, borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 11 },
  overallText: { flex: 1, fontSize: 14, fontFamily: "Inter_600SemiBold" },
  uptimeText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  summaryRow: { flexDirection: "row", gap: 10, paddingHorizontal: 16, marginBottom: 10 },
  sumCard: { flex: 1, borderRadius: 14, borderWidth: 1, padding: 12, alignItems: "center" },
  sumCount: { fontSize: 18, fontFamily: "Inter_700Bold" },
  sumLabel: { fontSize: 10, fontFamily: "Inter_500Medium", marginTop: 2 },
  errorBanner: { marginHorizontal: 16, marginBottom: 6, borderRadius: 10, padding: 10 },
  errorText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  list: { paddingHorizontal: 14, paddingTop: 4 },
  targetCard: { borderRadius: 18, borderWidth: 1, overflow: "hidden" },
  targetTop: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  statusIcon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  targetInfo: { flex: 1 },
  targetName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  targetUrl: { fontSize: 11, fontFamily: "monospace", marginTop: 3 },
  uptimeRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingBottom: 8 },
  uptimeLabel: { fontSize: 10, fontFamily: "Inter_500Medium", width: 44 },
  uptimeTrack: { flex: 1, height: 5, borderRadius: 3, overflow: "hidden" },
  uptimeFill: { height: 5, borderRadius: 3 },
  uptimePct: { fontSize: 11, fontFamily: "Inter_700Bold", width: 44, textAlign: "right" },
  errorMsg: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 7 },
  errorMsgText: { fontSize: 11, fontFamily: "Inter_400Regular", flex: 1 },
  targetStats: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, flexWrap: "wrap" },
  statPair: { flexDirection: "row", alignItems: "center", gap: 4 },
  statText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  rtBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  rtText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  testBtn: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10, marginLeft: "auto" },
  testBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  emptyWrap: { alignItems: "center", paddingTop: 80, gap: 10 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
});
