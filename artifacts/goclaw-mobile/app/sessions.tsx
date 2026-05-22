import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { useSessionsHistory, SessionInfo } from "@/hooks/useSessionsHistory";
import { useAgents } from "@/hooks/useAgents";
import { useAuth } from "@/context/AuthContext";

const MOCK_SESSIONS: SessionInfo[] = [
  { key: "sess_abc123", messageCount: 24, created: new Date(Date.now() - 86400000 * 2).toISOString(), updated: new Date(Date.now() - 3600000).toISOString(), label: "Marketing Q2 analysis", agentName: "Assistant", model: "claude-3-5-sonnet", channel: "web", inputTokens: 12400, outputTokens: 8200 },
  { key: "sess_def456", messageCount: 8, created: new Date(Date.now() - 86400000).toISOString(), updated: new Date(Date.now() - 7200000).toISOString(), agentName: "Code Expert", model: "gpt-4o", channel: "slack", inputTokens: 3200, outputTokens: 5600 },
  { key: "sess_ghi789", messageCount: 42, created: new Date(Date.now() - 86400000 * 5).toISOString(), updated: new Date(Date.now() - 86400000).toISOString(), label: "Research: LLM benchmark 2025", agentName: "Researcher", model: "gemini-pro", channel: "web", inputTokens: 28000, outputTokens: 18000 },
  { key: "sess_jkl012", messageCount: 6, created: new Date(Date.now() - 86400000 * 7).toISOString(), updated: new Date(Date.now() - 86400000 * 6).toISOString(), agentName: "Writer", model: "claude-3-5-haiku", channel: "telegram", inputTokens: 1800, outputTokens: 3400 },
  { key: "sess_mno345", messageCount: 15, created: new Date(Date.now() - 86400000 * 14).toISOString(), updated: new Date(Date.now() - 86400000 * 10).toISOString(), label: "Sprint planning", agentName: "Assistant", model: "gpt-4o", channel: "web", inputTokens: 6000, outputTokens: 4200 },
];

const CHANNEL_ICONS: Record<string, { icon: keyof typeof Ionicons["glyphMap"]; color: string }> = {
  web: { icon: "globe-outline", color: "#60a5fa" },
  telegram: { icon: "paper-plane-outline", color: "#2AABEE" },
  slack: { icon: "logo-slack", color: "#4A154B" },
  whatsapp: { icon: "logo-whatsapp", color: "#25D366" },
  email: { icon: "mail-outline", color: "#f97316" },
};

function fmtDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return "Vừa xong";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  if (diff < 86400000 * 7) return `${Math.floor(diff / 86400000)}d`;
  return new Date(iso).toLocaleDateString("vi", { day: "2-digit", month: "2-digit" });
}

function fmtTokens(n?: number): string {
  if (!n) return "";
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

export default function SessionsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { connected } = useAuth();
  const { agents } = useAgents();
  const [agentFilter, setAgentFilter] = useState<string | undefined>(undefined);
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { sessions: liveSessions, total, loading, error, refresh, deleteSession } = useSessionsHistory(agentFilter);
  const sessions = connected && liveSessions.length > 0
    ? liveSessions
    : MOCK_SESSIONS.filter((s) => !agentFilter || s.agentName?.toLowerCase().includes(agentFilter.toLowerCase()));

  const agentOptions = [
    { id: undefined, label: "Tất cả" },
    ...agents.map((a) => ({ id: a.id, label: a.display_name ?? a.id })),
  ];

  const handleDelete = (session: SessionInfo) => {
    Alert.alert(
      "Xóa session",
      `Xóa session "${session.label ?? session.key.slice(0, 12)}"?\nHành động này không thể hoàn tác.`,
      [
        { text: "Hủy", style: "cancel" },
        { text: "Xóa", style: "destructive", onPress: () => deleteSession(session.key) },
      ],
    );
  };

  const totalTokens = sessions.reduce((sum, s) => sum + (s.inputTokens ?? 0) + (s.outputTokens ?? 0), 0);
  const totalMessages = sessions.reduce((sum, s) => sum + s.messageCount, 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 4 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.titleArea}>
          <Text style={[styles.title, { color: colors.foreground }]}>Sessions</Text>
          <Text style={[styles.badge, { color: colors.mutedForeground }]}>{connected ? total : sessions.length}</Text>
        </View>
        <TouchableOpacity onPress={refresh} style={[styles.iconBtn, { backgroundColor: colors.muted }]} activeOpacity={0.7}>
          {loading ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="refresh-outline" size={15} color={colors.mutedForeground} />}
        </TouchableOpacity>
      </View>

      {/* Summary cards */}
      <View style={styles.summaryRow}>
        <View style={[styles.sumCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sumCount, { color: colors.primary }]}>{sessions.length}</Text>
          <Text style={[styles.sumLabel, { color: colors.mutedForeground }]}>Sessions</Text>
        </View>
        <View style={[styles.sumCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sumCount, { color: "#60a5fa" }]}>{totalMessages}</Text>
          <Text style={[styles.sumLabel, { color: colors.mutedForeground }]}>Messages</Text>
        </View>
        <View style={[styles.sumCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sumCount, { color: "#a78bfa" }]}>{fmtTokens(totalTokens)}</Text>
          <Text style={[styles.sumLabel, { color: colors.mutedForeground }]}>Tokens</Text>
        </View>
      </View>

      {/* Agent filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {agentOptions.map((opt) => {
          const active = agentFilter === opt.id;
          return (
            <TouchableOpacity
              key={opt.id ?? "all"}
              onPress={() => setAgentFilter(opt.id)}
              style={[styles.chip, { backgroundColor: active ? colors.primary + "22" : colors.muted, borderColor: active ? colors.primary + "55" : colors.border }]}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, { color: active ? colors.primary : colors.mutedForeground }]}>{opt.label}</Text>
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
        data={sessions}
        keyExtractor={(s) => s.key}
        renderItem={({ item }) => {
          const chCfg = CHANNEL_ICONS[item.channel ?? "web"] ?? CHANNEL_ICONS.web;
          const totalTok = (item.inputTokens ?? 0) + (item.outputTokens ?? 0);
          return (
            <View style={[styles.sessionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.cardTop}>
                <View style={[styles.sessionIcon, { backgroundColor: colors.primary + "18" }]}>
                  <Ionicons name="chatbubbles-outline" size={18} color={colors.primary} />
                </View>
                <View style={styles.sessionInfo}>
                  <Text style={[styles.sessionLabel, { color: colors.foreground }]} numberOfLines={1}>
                    {item.label ?? item.key.slice(0, 20)}
                  </Text>
                  <View style={styles.sessionMeta}>
                    {item.agentName && (
                      <Text style={[styles.agentName, { color: colors.primary }]}>{item.agentName}</Text>
                    )}
                    {item.model && (
                      <Text style={[styles.metaDot, { color: colors.border }]}>·</Text>
                    )}
                    {item.model && (
                      <Text style={[styles.modelName, { color: colors.mutedForeground }]} numberOfLines={1}>{item.model}</Text>
                    )}
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => handleDelete(item)}
                  style={styles.deleteBtn}
                  activeOpacity={0.7}
                >
                  <Ionicons name="trash-outline" size={16} color={colors.destructive} />
                </TouchableOpacity>
              </View>

              <View style={[styles.cardStats, { borderTopColor: colors.border }]}>
                <View style={styles.statPair}>
                  <Ionicons name="chatbubble-outline" size={11} color={colors.mutedForeground} />
                  <Text style={[styles.statVal, { color: colors.foreground }]}>{item.messageCount}</Text>
                  <Text style={[styles.statLbl, { color: colors.mutedForeground }]}>msgs</Text>
                </View>
                {totalTok > 0 && (
                  <View style={styles.statPair}>
                    <Ionicons name="flash-outline" size={11} color={colors.mutedForeground} />
                    <Text style={[styles.statVal, { color: colors.foreground }]}>{fmtTokens(totalTok)}</Text>
                    <Text style={[styles.statLbl, { color: colors.mutedForeground }]}>tokens</Text>
                  </View>
                )}
                <View style={styles.statPair}>
                  <Ionicons name={chCfg.icon} size={11} color={chCfg.color} />
                  <Text style={[styles.statVal, { color: chCfg.color }]}>{item.channel ?? "web"}</Text>
                </View>
                <Text style={[styles.updatedAt, { color: colors.mutedForeground }]}>{fmtDate(item.updated)}</Text>
              </View>
            </View>
          );
        }}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 40 }]}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="chatbubbles-outline" size={36} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Không có sessions</Text>
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
  titleArea: { flex: 1, flexDirection: "row", alignItems: "baseline", gap: 8 },
  title: { fontSize: 20, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  badge: { fontSize: 12, fontFamily: "Inter_400Regular" },
  iconBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  summaryRow: { flexDirection: "row", gap: 10, paddingHorizontal: 16, marginBottom: 10 },
  sumCard: { flex: 1, borderRadius: 14, borderWidth: 1, padding: 12, alignItems: "center" },
  sumCount: { fontSize: 20, fontFamily: "Inter_700Bold" },
  sumLabel: { fontSize: 11, fontFamily: "Inter_500Medium", marginTop: 2 },
  filterRow: { paddingHorizontal: 14, paddingVertical: 5, gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  errorBanner: { marginHorizontal: 16, marginBottom: 6, borderRadius: 10, padding: 10 },
  errorText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  list: { paddingHorizontal: 14, paddingTop: 8 },
  sessionCard: { borderRadius: 18, borderWidth: 1, overflow: "hidden" },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  sessionIcon: { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  sessionInfo: { flex: 1 },
  sessionLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  sessionMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  agentName: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  metaDot: { fontSize: 11 },
  modelName: { fontSize: 11, fontFamily: "Inter_400Regular", flex: 1 },
  deleteBtn: { padding: 6 },
  cardStats: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth },
  statPair: { flexDirection: "row", alignItems: "center", gap: 4 },
  statVal: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  statLbl: { fontSize: 10, fontFamily: "Inter_400Regular" },
  updatedAt: { fontSize: 11, fontFamily: "Inter_400Regular", marginLeft: "auto" },
  emptyWrap: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
});
