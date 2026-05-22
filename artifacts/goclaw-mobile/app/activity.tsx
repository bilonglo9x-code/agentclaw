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
import { useActivity, ActivityLog } from "@/hooks/useActivity";
import { useAuth } from "@/context/AuthContext";

const ACTION_ICONS: Record<string, { icon: keyof typeof Ionicons["glyphMap"]; color: string }> = {
  create: { icon: "add-circle-outline", color: "#22c55e" },
  update: { icon: "create-outline", color: "#60a5fa" },
  delete: { icon: "trash-outline", color: "#ef4444" },
  login: { icon: "log-in-outline", color: "#f97316" },
  logout: { icon: "log-out-outline", color: "#a1a1aa" },
  revoke: { icon: "ban-outline", color: "#ef4444" },
  approve: { icon: "checkmark-circle-outline", color: "#22c55e" },
  deny: { icon: "close-circle-outline", color: "#ef4444" },
  enable: { icon: "power-outline", color: "#22c55e" },
  disable: { icon: "power-outline", color: "#a1a1aa" },
  run: { icon: "play-outline", color: "#f97316" },
  import: { icon: "cloud-download-outline", color: "#a78bfa" },
  export: { icon: "cloud-upload-outline", color: "#a78bfa" },
};

const ENTITY_ICONS: Record<string, { icon: keyof typeof Ionicons["glyphMap"]; color: string }> = {
  agent: { icon: "planet-outline", color: "#f97316" },
  session: { icon: "chatbubble-outline", color: "#60a5fa" },
  provider: { icon: "server-outline", color: "#a78bfa" },
  channel: { icon: "hardware-chip-outline", color: "#60a5fa" },
  mcp_server: { icon: "link-outline", color: "#22c55e" },
  cron_job: { icon: "time-outline", color: "#22c55e" },
  api_key: { icon: "key-outline", color: "#f59e0b" },
  skill: { icon: "flash-outline", color: "#f59e0b" },
  team: { icon: "people-outline", color: "#a78bfa" },
  vault_document: { icon: "document-text-outline", color: "#71717a" },
};

const MOCK_LOGS: ActivityLog[] = [
  { id: "a1", actor_type: "user", actor_id: "admin", action: "create", entity_type: "agent", entity_id: "new-agent-xyz", details: { name: "New Sales Agent" }, ip_address: "192.168.1.1", created_at: new Date(Date.now() - 600000).toISOString() },
  { id: "a2", actor_type: "user", actor_id: "admin", action: "enable", entity_type: "channel", entity_id: "telegram-main", details: { channel: "telegram" }, ip_address: "192.168.1.1", created_at: new Date(Date.now() - 1800000).toISOString() },
  { id: "a3", actor_type: "system", actor_id: "system", action: "run", entity_type: "cron_job", entity_id: "daily-report", details: { status: "ok", duration_ms: 4200 }, ip_address: "", created_at: new Date(Date.now() - 3600000).toISOString() },
  { id: "a4", actor_type: "user", actor_id: "dev-user", action: "create", entity_type: "api_key", entity_id: "k3", details: { name: "Dev Testing Key" }, ip_address: "10.0.0.2", created_at: new Date(Date.now() - 86400000).toISOString() },
  { id: "a5", actor_type: "user", actor_id: "admin", action: "update", entity_type: "provider", entity_id: "openai-main", details: { field: "api_key" }, ip_address: "192.168.1.1", created_at: new Date(Date.now() - 86400000 * 2).toISOString() },
  { id: "a6", actor_type: "user", actor_id: "admin", action: "revoke", entity_type: "api_key", entity_id: "k4", details: { name: "Old Integration" }, ip_address: "192.168.1.1", created_at: new Date(Date.now() - 86400000 * 3).toISOString() },
  { id: "a7", actor_type: "user", actor_id: "admin", action: "login", entity_type: "session", entity_id: "sess-abc", details: {}, ip_address: "192.168.1.100", created_at: new Date(Date.now() - 86400000 * 4).toISOString() },
  { id: "a8", actor_type: "system", actor_id: "system", action: "import", entity_type: "skill", entity_id: "python-runner", details: { version: "1.2.0" }, ip_address: "", created_at: new Date(Date.now() - 86400000 * 5).toISOString() },
];

const ACTION_FILTERS = ["Tất cả", "create", "update", "delete", "login", "revoke", "enable", "disable", "run"];
const ENTITY_FILTERS = ["Tất cả", "agent", "channel", "provider", "api_key", "cron_job", "skill", "team"];

function fmtTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return "Vừa xong";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m trước`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h trước`;
  if (diff < 86400000 * 7) return `${Math.floor(diff / 86400000)}d trước`;
  return new Date(iso).toLocaleDateString("vi");
}

function describeLog(log: ActivityLog): string {
  const action = log.action;
  const entity = log.entity_type.replace(/_/g, " ");
  const details = log.details as Record<string, unknown>;
  const name = details?.name ?? details?.channel ?? log.entity_id.slice(0, 12);
  return `${action} ${entity}: ${name}`;
}

export default function ActivityScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { connected } = useAuth();
  const { logs: liveLogs, total: liveTotal, loading, error, refresh } = useActivity(100);
  const [actionFilter, setActionFilter] = useState("Tất cả");
  const [entityFilter, setEntityFilter] = useState("Tất cả");
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const allLogs = connected && liveLogs.length > 0 ? liveLogs : MOCK_LOGS;
  const logs = allLogs.filter((l) => {
    if (actionFilter !== "Tất cả" && l.action !== actionFilter) return false;
    if (entityFilter !== "Tất cả" && l.entity_type !== entityFilter) return false;
    return true;
  });
  const total = connected ? liveTotal : allLogs.length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 4 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.titleArea}>
          <Text style={[styles.title, { color: colors.foreground }]}>Activity</Text>
          <Text style={[styles.totalBadge, { color: colors.mutedForeground }]}>{total} events</Text>
        </View>
        <TouchableOpacity onPress={refresh} style={[styles.iconBtn, { backgroundColor: colors.muted }]} activeOpacity={0.7}>
          {loading ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="refresh-outline" size={15} color={colors.mutedForeground} />}
        </TouchableOpacity>
      </View>

      {/* Action filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {ACTION_FILTERS.map((f) => {
          const active = actionFilter === f;
          const cfg = ACTION_ICONS[f];
          return (
            <TouchableOpacity
              key={f}
              onPress={() => setActionFilter(f)}
              style={[styles.chip, { backgroundColor: active ? colors.primary + "20" : colors.muted, borderColor: active ? colors.primary + "50" : colors.border }]}
              activeOpacity={0.7}
            >
              {cfg && <Ionicons name={cfg.icon} size={12} color={active ? colors.primary : colors.mutedForeground} />}
              <Text style={[styles.chipText, { color: active ? colors.primary : colors.mutedForeground }]}>{f}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Entity filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow2}>
        {ENTITY_FILTERS.map((f) => {
          const active = entityFilter === f;
          const cfg = ENTITY_ICONS[f];
          return (
            <TouchableOpacity
              key={f}
              onPress={() => setEntityFilter(f)}
              style={[styles.smallChip, { backgroundColor: active ? "#a78bfa20" : colors.muted, borderColor: active ? "#a78bfa50" : colors.border }]}
              activeOpacity={0.7}
            >
              {cfg && <Ionicons name={cfg.icon} size={10} color={active ? "#a78bfa" : colors.mutedForeground} />}
              <Text style={[styles.smallChipText, { color: active ? "#a78bfa" : colors.mutedForeground }]}>{f}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {error && (
        <View style={[styles.errorBanner, { backgroundColor: colors.destructive + "15" }]}>
          <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
        </View>
      )}

      <FlatList
        data={logs}
        keyExtractor={(l) => l.id}
        renderItem={({ item }) => {
          const actionCfg = ACTION_ICONS[item.action] ?? { icon: "ellipse-outline" as const, color: colors.mutedForeground };
          const entityCfg = ENTITY_ICONS[item.entity_type] ?? { icon: "cube-outline" as const, color: colors.mutedForeground };

          return (
            <View style={[styles.logRow, { borderBottomColor: colors.border }]}>
              <View style={[styles.actionIcon, { backgroundColor: actionCfg.color + "18" }]}>
                <Ionicons name={actionCfg.icon} size={15} color={actionCfg.color} />
              </View>
              <View style={styles.logContent}>
                <Text style={[styles.logDesc, { color: colors.foreground }]} numberOfLines={2}>
                  {describeLog(item)}
                </Text>
                <View style={styles.logMeta}>
                  <Ionicons name={entityCfg.icon} size={11} color={entityCfg.color} />
                  <Text style={[styles.entityType, { color: entityCfg.color }]}>{item.entity_type.replace(/_/g, " ")}</Text>
                  <Text style={[styles.dot, { color: colors.border }]}>·</Text>
                  <Ionicons name={item.actor_type === "system" ? "settings-outline" : "person-outline"} size={11} color={colors.mutedForeground} />
                  <Text style={[styles.actorId, { color: colors.mutedForeground }]}>{item.actor_id}</Text>
                  {!!item.ip_address && (
                    <>
                      <Text style={[styles.dot, { color: colors.border }]}>·</Text>
                      <Text style={[styles.ipAddr, { color: colors.mutedForeground }]}>{item.ip_address}</Text>
                    </>
                  )}
                </View>
              </View>
              <Text style={[styles.logTime, { color: colors.mutedForeground }]}>{fmtTime(item.created_at)}</Text>
            </View>
          );
        }}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="list-outline" size={36} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Không có activity logs</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingBottom: 6, gap: 8 },
  backBtn: { padding: 4 },
  titleArea: { flex: 1, flexDirection: "row", alignItems: "baseline", gap: 8 },
  title: { fontSize: 20, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  totalBadge: { fontSize: 12, fontFamily: "Inter_400Regular" },
  iconBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  filterRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 5, gap: 7 },
  filterRow2: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 4, gap: 6 },
  chip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 11, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  smallChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 14, borderWidth: 1 },
  smallChipText: { fontSize: 10, fontFamily: "Inter_500Medium" },
  errorBanner: { marginHorizontal: 16, marginVertical: 6, borderRadius: 10, padding: 10 },
  errorText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  list: {},
  logRow: { flexDirection: "row", alignItems: "flex-start", paddingHorizontal: 16, paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth, gap: 10 },
  actionIcon: { width: 30, height: 30, borderRadius: 10, alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 },
  logContent: { flex: 1, gap: 4 },
  logDesc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  logMeta: { flexDirection: "row", alignItems: "center", gap: 4, flexWrap: "wrap" },
  entityType: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  dot: { fontSize: 11 },
  actorId: { fontSize: 10, fontFamily: "Inter_400Regular" },
  ipAddr: { fontSize: 10, fontFamily: "monospace" },
  logTime: { fontSize: 10, fontFamily: "Inter_400Regular", flexShrink: 0, marginTop: 4 },
  emptyWrap: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
});
