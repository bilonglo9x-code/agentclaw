import React, { useRef } from "react";
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useEvents, LiveEvent } from "@/hooks/useEvents";

const SOURCE_CONFIG: Record<string, { color: string; icon: keyof typeof Ionicons["glyphMap"]; label: string }> = {
  agent: { color: "#f97316", icon: "planet-outline", label: "Agent" },
  chat: { color: "#60a5fa", icon: "chatbubble-outline", label: "Chat" },
  cron: { color: "#22c55e", icon: "time-outline", label: "Cron" },
  system: { color: "#a1a1aa", icon: "settings-outline", label: "System" },
  trace: { color: "#a78bfa", icon: "search-outline", label: "Trace" },
};

const STATUS_COLORS: Record<string, string> = {
  success: "#22c55e",
  error: "#ef4444",
  running: "#60a5fa",
};

function fmtTime(ts: number): string {
  const d = new Date(ts);
  const diff = Date.now() - ts;
  if (diff < 60000) return `${Math.floor(diff / 1000)}s`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  return d.toLocaleTimeString("vi", { hour: "2-digit", minute: "2-digit" });
}

const MOCK_EVENTS: LiveEvent[] = [
  { id: "e1", timestamp: Date.now() - 5000, source: "agent", type: "run.completed", agentName: "Sales Assistant", sessionKey: "sess_abc", summary: "Sales Assistant hoàn thành phân tích", status: "success" },
  { id: "e2", timestamp: Date.now() - 12000, source: "agent", type: "tool.call", agentName: "Code Expert", sessionKey: "sess_xyz", summary: "Code Expert gọi tool: run_python_code", status: "running" },
  { id: "e3", timestamp: Date.now() - 35000, source: "chat", type: "message", agentName: "Researcher", sessionKey: "sess_def", summary: "Tin nhắn mới: Tôi đã tìm được 12 bài báo liên quan..." },
  { id: "e4", timestamp: Date.now() - 60000, source: "cron", type: "cron", summary: "Cron job daily_report: triggered", status: "success" },
  { id: "e5", timestamp: Date.now() - 120000, source: "agent", type: "run.failed", agentName: "Monitor Agent", summary: "Monitor Agent gặp lỗi: Provider timeout", status: "error" },
  { id: "e6", timestamp: Date.now() - 180000, source: "trace", type: "trace.status", agentName: "Writer", summary: "Trace ab12cd34 → completed", status: "success" },
  { id: "e7", timestamp: Date.now() - 300000, source: "agent", type: "run.started", agentName: "Researcher", sessionKey: "sess_def", summary: "Researcher bắt đầu chạy", status: "running" },
  { id: "e8", timestamp: Date.now() - 600000, source: "chat", type: "chunk", summary: "Tin nhắn mới: Kết quả phân tích cho thấy..." },
];

export default function EventsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { events: liveEvents, connected, clear } = useEvents();
  const listRef = useRef<FlatList>(null);
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const events = connected && liveEvents.length > 0 ? liveEvents : MOCK_EVENTS;

  const agentCount = events.filter((e) => e.source === "agent").length;
  const errorCount = events.filter((e) => e.status === "error").length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 4 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.titleArea}>
          <Text style={[styles.title, { color: colors.foreground }]}>Events</Text>
          {connected && (
            <View style={styles.liveRow}>
              <View style={[styles.liveDot, { backgroundColor: "#22c55e" }]} />
              <Text style={[styles.liveText, { color: "#22c55e" }]}>Live</Text>
            </View>
          )}
        </View>
        <TouchableOpacity onPress={clear} style={[styles.iconBtn, { backgroundColor: colors.muted }]} activeOpacity={0.7}>
          <Ionicons name="trash-outline" size={15} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      {/* Stats bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={[styles.statCount, { color: colors.foreground }]}>{events.length}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>events</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statCount, { color: colors.primary }]}>{agentCount}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>agent</Text>
        </View>
        {errorCount > 0 && (
          <>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statCount, { color: "#ef4444" }]}>{errorCount}</Text>
              <Text style={[styles.statLabel, { color: "#ef4444" }]}>errors</Text>
            </View>
          </>
        )}
        {!connected && (
          <View style={[styles.demoBadge, { backgroundColor: colors.muted }]}>
            <Text style={[styles.demoText, { color: colors.mutedForeground }]}>Demo data</Text>
          </View>
        )}
      </View>

      <FlatList
        ref={listRef}
        data={events}
        keyExtractor={(e) => e.id}
        renderItem={({ item }) => {
          const srcCfg = SOURCE_CONFIG[item.source] ?? SOURCE_CONFIG.system;
          const statusColor = item.status ? STATUS_COLORS[item.status] : undefined;
          return (
            <View style={[styles.eventRow, { borderBottomColor: colors.border }]}>
              <View style={[styles.sourceIcon, { backgroundColor: srcCfg.color + "18" }]}>
                <Ionicons name={srcCfg.icon} size={14} color={srcCfg.color} />
              </View>
              <View style={styles.eventContent}>
                <View style={styles.eventTop}>
                  <View style={styles.eventMeta}>
                    <Text style={[styles.sourceBadge, { color: srcCfg.color }]}>{srcCfg.label}</Text>
                    {item.agentName && (
                      <>
                        <Text style={[styles.dot, { color: colors.border }]}>·</Text>
                        <Text style={[styles.agentName, { color: colors.mutedForeground }]}>{item.agentName}</Text>
                      </>
                    )}
                  </View>
                  <Text style={[styles.eventTime, { color: colors.mutedForeground }]}>{fmtTime(item.timestamp)}</Text>
                </View>
                <Text style={[styles.summary, { color: statusColor ?? colors.foreground }]} numberOfLines={2}>
                  {item.summary}
                </Text>
                {item.sessionKey && (
                  <Text style={[styles.sessionKey, { color: colors.mutedForeground }]}>
                    {item.sessionKey.slice(0, 12)}…
                  </Text>
                )}
              </View>
              {item.status && (
                <View style={[styles.statusDot, { backgroundColor: statusColor ?? "transparent" }]} />
              )}
            </View>
          );
        }}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="radio-outline" size={36} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Không có events</Text>
            <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
              {connected ? "Chờ events từ agents và hệ thống..." : "Kết nối server để xem events realtime"}
            </Text>
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
  titleArea: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontSize: 20, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  liveRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  liveText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  iconBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  statsBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 8, gap: 10 },
  statItem: { flexDirection: "row", alignItems: "baseline", gap: 3 },
  statCount: { fontSize: 14, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  statDivider: { width: 1, height: 12 },
  demoBadge: { marginLeft: "auto", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  demoText: { fontSize: 10, fontFamily: "Inter_400Regular" },
  list: { paddingTop: 4 },
  eventRow: { flexDirection: "row", alignItems: "flex-start", paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, gap: 10 },
  sourceIcon: { width: 28, height: 28, borderRadius: 9, alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 },
  eventContent: { flex: 1 },
  eventTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 3 },
  eventMeta: { flexDirection: "row", alignItems: "center", gap: 4, flex: 1 },
  sourceBadge: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  dot: { fontSize: 11 },
  agentName: { fontSize: 11, fontFamily: "Inter_400Regular", flex: 1 },
  eventTime: { fontSize: 10, fontFamily: "Inter_400Regular", flexShrink: 0 },
  summary: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  sessionKey: { fontSize: 10, fontFamily: "monospace", marginTop: 3 },
  statusDot: { width: 7, height: 7, borderRadius: 4, marginTop: 8, flexShrink: 0 },
  emptyWrap: { alignItems: "center", paddingTop: 80, gap: 8, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  emptySubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 18 },
});
