import React from "react";
import {
  ActivityIndicator,
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
import { useChannels, ChannelInstance, ChannelStatus } from "@/hooks/useChannels";

const CHANNEL_ICONS: Record<string, { icon: keyof typeof Ionicons["glyphMap"]; color: string }> = {
  telegram: { icon: "paper-plane-outline", color: "#2AABEE" },
  slack: { icon: "logo-slack", color: "#4A154B" },
  whatsapp: { icon: "logo-whatsapp", color: "#25D366" },
  email: { icon: "mail-outline", color: "#f97316" },
  zalo: { icon: "chatbubble-outline", color: "#006AF5" },
  webhook: { icon: "link-outline", color: "#a78bfa" },
  chatgpt: { icon: "chatbubbles-outline", color: "#10b981" },
};

const STATE_CONFIG: Record<string, { color: string; label: string }> = {
  healthy: { color: "#22c55e", label: "Healthy" },
  starting: { color: "#60a5fa", label: "Starting" },
  degraded: { color: "#f59e0b", label: "Degraded" },
  failed: { color: "#ef4444", label: "Failed" },
  stopped: { color: "#a1a1aa", label: "Stopped" },
  registered: { color: "#71717a", label: "Registered" },
};

const MOCK_INSTANCES: ChannelInstance[] = [
  { id: "ch1", name: "telegram_main", display_name: "Telegram Main Bot", channel_type: "telegram", agent_id: "assistant", enabled: true, is_default: true, has_credentials: true, created_at: new Date(Date.now() - 86400000 * 30).toISOString() },
  { id: "ch2", name: "slack_workspace", display_name: "Slack Workspace", channel_type: "slack", agent_id: "assistant", enabled: true, is_default: false, has_credentials: true, created_at: new Date(Date.now() - 86400000 * 14).toISOString() },
  { id: "ch3", name: "email_support", display_name: "Email Support", channel_type: "email", agent_id: "support", enabled: false, is_default: false, has_credentials: true, created_at: new Date(Date.now() - 86400000 * 7).toISOString() },
  { id: "ch4", name: "whatsapp_biz", display_name: "WhatsApp Business", channel_type: "whatsapp", agent_id: "sales", enabled: true, is_default: false, has_credentials: false, created_at: new Date(Date.now() - 86400000 * 5).toISOString() },
  { id: "ch5", name: "webhook_crm", display_name: "CRM Webhook", channel_type: "webhook", agent_id: "assistant", enabled: true, is_default: false, has_credentials: true, created_at: new Date(Date.now() - 86400000 * 2).toISOString() },
];

const MOCK_STATUSES: Record<string, ChannelStatus> = {
  ch1: { enabled: true, running: true, state: "healthy", summary: "Đang hoạt động tốt" },
  ch2: { enabled: true, running: true, state: "healthy" },
  ch3: { enabled: false, running: false, state: "stopped" },
  ch4: { enabled: true, running: false, state: "failed", summary: "Chưa có credentials", failure_kind: "auth" },
  ch5: { enabled: true, running: true, state: "healthy" },
};

export default function ChannelsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { instances: liveInst, statuses: liveStatus, loading, error, toggle, refresh } = useChannels();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const instances = liveInst.length > 0 ? liveInst : MOCK_INSTANCES;
  const statuses = Object.keys(liveStatus).length > 0 ? liveStatus : MOCK_STATUSES;

  const healthyCount = instances.filter((i) => statuses[i.id]?.state === "healthy").length;
  const failedCount = instances.filter((i) => statuses[i.id]?.state === "failed").length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 4 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>Channels</Text>
        <TouchableOpacity onPress={refresh} style={[styles.iconBtn, { backgroundColor: colors.muted }]} activeOpacity={0.7}>
          {loading ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="refresh-outline" size={15} color={colors.mutedForeground} />}
        </TouchableOpacity>
      </View>

      {/* Summary */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sumCount, { color: "#22c55e" }]}>{healthyCount}</Text>
          <Text style={[styles.sumLabel, { color: colors.mutedForeground }]}>Healthy</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sumCount, { color: colors.foreground }]}>{instances.length}</Text>
          <Text style={[styles.sumLabel, { color: colors.mutedForeground }]}>Total</Text>
        </View>
        {failedCount > 0 && (
          <View style={[styles.summaryCard, { backgroundColor: "#ef444415", borderColor: "#ef444430" }]}>
            <Text style={[styles.sumCount, { color: "#ef4444" }]}>{failedCount}</Text>
            <Text style={[styles.sumLabel, { color: "#ef4444" }]}>Failed</Text>
          </View>
        )}
      </View>

      {error && (
        <View style={[styles.errorBanner, { backgroundColor: colors.destructive + "15" }]}>
          <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
        </View>
      )}

      <FlatList
        data={instances}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const status = statuses[item.id];
          const channelCfg = CHANNEL_ICONS[item.channel_type] ?? { icon: "radio-outline", color: colors.primary };
          const stateCfg = STATE_CONFIG[status?.state ?? "stopped"] ?? STATE_CONFIG.stopped;

          return (
            <View style={[styles.channelCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.cardTop}>
                <View style={[styles.channelIcon, { backgroundColor: channelCfg.color + "20" }]}>
                  <Ionicons name={channelCfg.icon} size={20} color={channelCfg.color} />
                </View>
                <View style={styles.channelInfo}>
                  <View style={styles.nameRow}>
                    <Text style={[styles.displayName, { color: colors.foreground }]} numberOfLines={1}>
                      {item.display_name}
                    </Text>
                    {item.is_default && (
                      <View style={[styles.defaultBadge, { backgroundColor: colors.primary + "20" }]}>
                        <Text style={[styles.defaultText, { color: colors.primary }]}>Default</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.metaRow}>
                    <Text style={[styles.channelType, { color: channelCfg.color }]}>{item.channel_type}</Text>
                    <Text style={[styles.dot, { color: colors.border }]}>·</Text>
                    <Text style={[styles.agentId, { color: colors.mutedForeground }]}>{item.agent_id}</Text>
                  </View>
                </View>
                <Switch
                  value={item.enabled}
                  onValueChange={(v) => toggle(item.id, v)}
                  trackColor={{ true: colors.primary, false: colors.muted }}
                  thumbColor="#fff"
                  ios_backgroundColor={colors.muted}
                />
              </View>

              {/* Status row */}
              <View style={[styles.statusRow, { borderTopColor: colors.border }]}>
                <View style={styles.statusLeft}>
                  <View style={[styles.stateDot, { backgroundColor: stateCfg.color }]} />
                  <Text style={[styles.stateText, { color: stateCfg.color }]}>{stateCfg.label}</Text>
                  {status?.summary && (
                    <Text style={[styles.stateSummary, { color: colors.mutedForeground }]} numberOfLines={1}>
                      — {status.summary}
                    </Text>
                  )}
                </View>
                {!item.has_credentials && (
                  <View style={[styles.credsBadge, { backgroundColor: "#f59e0b20", borderColor: "#f59e0b40" }]}>
                    <Ionicons name="key-outline" size={10} color="#f59e0b" />
                    <Text style={[styles.credsText, { color: "#f59e0b" }]}>No credentials</Text>
                  </View>
                )}
              </View>
            </View>
          );
        }}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="hardware-chip-outline" size={36} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Không có channels</Text>
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
  summaryRow: { flexDirection: "row", gap: 10, paddingHorizontal: 16, marginBottom: 12 },
  summaryCard: { flex: 1, borderRadius: 14, borderWidth: 1, padding: 12, alignItems: "center" },
  sumCount: { fontSize: 20, fontFamily: "Inter_700Bold" },
  sumLabel: { fontSize: 11, fontFamily: "Inter_500Medium", marginTop: 2 },
  errorBanner: { marginHorizontal: 16, marginBottom: 8, borderRadius: 10, padding: 10 },
  errorText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  list: { paddingHorizontal: 14, paddingTop: 4 },
  channelCard: { borderRadius: 18, borderWidth: 1, overflow: "hidden" },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  channelIcon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  channelInfo: { flex: 1 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  displayName: { fontSize: 15, fontFamily: "Inter_600SemiBold", flex: 1 },
  defaultBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  defaultText: { fontSize: 9, fontFamily: "Inter_600SemiBold" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 3 },
  channelType: { fontSize: 12, fontFamily: "Inter_600SemiBold", textTransform: "capitalize" },
  dot: { fontSize: 12 },
  agentId: { fontSize: 12, fontFamily: "Inter_400Regular" },
  statusRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth },
  statusLeft: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1 },
  stateDot: { width: 7, height: 7, borderRadius: 4 },
  stateText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  stateSummary: { fontSize: 11, fontFamily: "Inter_400Regular", flex: 1 },
  credsBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  credsText: { fontSize: 9, fontFamily: "Inter_600SemiBold" },
  emptyWrap: { alignItems: "center", paddingTop: 80, gap: 10 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
});
