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
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAgentDetail } from "@/hooks/useAgentDetail";
import { useSessionsHistory } from "@/hooks/useSessionsHistory";

type Tab = "overview" | "files" | "sessions" | "config";

const STATUS_CONFIG = {
  active: { color: "#22c55e", label: "Active" },
  inactive: { color: "#a1a1aa", label: "Inactive" },
  archived: { color: "#71717a", label: "Archived" },
};

const AGENT_TYPE_ICONS: Record<string, keyof typeof Ionicons["glyphMap"]> = {
  open: "planet-outline",
  personal: "person-outline",
  shared: "people-outline",
  assistant: "chatbubble-ellipses-outline",
};

const CHANNEL_ICONS: Record<string, keyof typeof Ionicons["glyphMap"]> = {
  web: "globe-outline",
  slack: "logo-slack",
  telegram: "paper-plane-outline",
  discord: "logo-discord",
  api: "code-slash-outline",
};

function InfoRow({ label, value, mono = false, colors }: { label: string; value: string; mono?: boolean; colors: any }) {
  return (
    <View style={rowStyles.row}>
      <Text style={[rowStyles.label, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[rowStyles.value, { color: colors.foreground, fontFamily: mono ? "monospace" : "Inter_400Regular" }]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, gap: 16 },
  label: { fontSize: 13, fontFamily: "Inter_400Regular", flexShrink: 0 },
  value: { fontSize: 13, flex: 1, textAlign: "right" },
});

function formatRelative(iso: string): string {
  const d = new Date(iso);
  const now = Date.now();
  const diff = now - d.getTime();
  if (diff < 60_000) return "vừa xong";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}p trước`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h trước`;
  return d.toLocaleDateString("vi");
}

export default function AgentDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { agent, files, loading, error, refresh } = useAgentDetail(id);
  const { sessions, loading: sessLoading, deleteSession } = useSessionsHistory();
  const [tab, setTab] = useState<Tab>("overview");
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const stCfg = agent ? (STATUS_CONFIG[agent.status] ?? STATUS_CONFIG.active) : STATUS_CONFIG.active;

  const agentSessions = sessions.filter(
    (s) => s.agentName === agent?.agent_key || s.agentName === agent?.name,
  );

  const TABS: { value: Tab; label: string }[] = [
    { value: "overview", label: "Tổng quan" },
    { value: "files", label: "Files" },
    { value: "sessions", label: `Sessions${agentSessions.length > 0 ? ` (${agentSessions.length})` : ""}` },
    { value: "config", label: "Config" },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 4 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]} numberOfLines={1}>
          {agent?.name ?? agent?.agent_key ?? (loading ? "Loading..." : "Agent")}
        </Text>
        <TouchableOpacity
          onPress={() => router.push({ pathname: "/agent/create", params: { id } })}
          style={[styles.iconBtn, { backgroundColor: colors.muted }]}
          activeOpacity={0.7}
        >
          <Ionicons name="create-outline" size={15} color={colors.mutedForeground} />
        </TouchableOpacity>
        <TouchableOpacity onPress={refresh} style={[styles.iconBtn, { backgroundColor: colors.muted }]} activeOpacity={0.7}>
          {loading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons name="refresh-outline" size={15} color={colors.mutedForeground} />
          )}
        </TouchableOpacity>
      </View>

      {error && (
        <View style={[styles.errorBanner, { backgroundColor: colors.destructive + "15", borderColor: colors.destructive + "30" }]}>
          <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
        </View>
      )}

      {agent && (
        <>
          {/* Agent identity card */}
          <View style={[styles.identityCard, { backgroundColor: colors.card, borderColor: colors.border, marginHorizontal: 16 }]}>
            <View style={[styles.agentAvatar, { backgroundColor: colors.primary + "20" }]}>
              <Ionicons
                name={AGENT_TYPE_ICONS[agent.agent_type ?? "open"] ?? "planet-outline"}
                size={28}
                color={colors.primary}
              />
            </View>
            <View style={styles.identityInfo}>
              <Text style={[styles.agentName, { color: colors.foreground }]}>
                {agent.name ?? agent.agent_key}
              </Text>
              <Text style={[styles.agentKey, { color: colors.mutedForeground }]}>
                {agent.agent_key}
              </Text>
            </View>
            <View style={styles.identityRight}>
              <View style={[styles.statusBadge, { backgroundColor: stCfg.color + "20" }]}>
                <View style={[styles.statusDot, { backgroundColor: stCfg.color }]} />
                <Text style={[styles.statusText, { color: stCfg.color }]}>{stCfg.label}</Text>
              </View>
              {agent.is_default && (
                <View style={[styles.defaultBadge, { backgroundColor: colors.primary + "20" }]}>
                  <Text style={[styles.defaultText, { color: colors.primary }]}>Default</Text>
                </View>
              )}
            </View>
          </View>

          {/* Model / Provider quick info */}
          <View style={styles.quickRow}>
            {[
              { icon: "hardware-chip-outline" as const, label: agent.model || "—" },
              { icon: "cloud-outline" as const, label: agent.provider || "—" },
              { icon: agent.memory_enabled ? "library-outline" as const : "close-circle-outline" as const, label: agent.memory_enabled ? "Memory on" : "Memory off", color: agent.memory_enabled ? "#22c55e" : colors.mutedForeground },
            ].map((item, i) => (
              <View key={i} style={[styles.quickCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name={item.icon} size={14} color={(item as any).color ?? colors.primary} />
                <Text style={[styles.quickLabel, { color: colors.mutedForeground }]} numberOfLines={1}>{item.label}</Text>
              </View>
            ))}
          </View>

          {/* Tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={[styles.tabRow, { borderBottomColor: colors.border }]}
            contentContainerStyle={{ paddingHorizontal: 16, alignItems: "center" }}
          >
            {TABS.map((t) => (
              <TouchableOpacity
                key={t.value}
                onPress={() => setTab(t.value)}
                style={[styles.tab, tab === t.value && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabText, { color: tab === t.value ? colors.primary : colors.mutedForeground }]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {(tab === "overview" || tab === "files" || tab === "config") && (
            <ScrollView
              style={styles.tabContent}
              contentContainerStyle={[styles.tabContentInner, { paddingBottom: insets.bottom + 40 }]}
              showsVerticalScrollIndicator={false}
            >
              {tab === "overview" && (
                <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  {agent.description ? (
                    <Text style={[styles.description, { color: colors.mutedForeground }]}>{agent.description}</Text>
                  ) : null}
                  <InfoRow label="Provider" value={agent.provider || "—"} colors={colors} />
                  <View style={[styles.divider, { backgroundColor: colors.border }]} />
                  <InfoRow label="Model" value={agent.model || "—"} colors={colors} />
                  <View style={[styles.divider, { backgroundColor: colors.border }]} />
                  <InfoRow label="Agent type" value={agent.agent_type ?? "open"} colors={colors} />
                  <View style={[styles.divider, { backgroundColor: colors.border }]} />
                  {agent.context_window ? (
                    <>
                      <InfoRow label="Context window" value={`${(agent.context_window / 1000).toFixed(0)}K tokens`} colors={colors} />
                      <View style={[styles.divider, { backgroundColor: colors.border }]} />
                    </>
                  ) : null}
                  {agent.max_tool_iterations ? (
                    <>
                      <InfoRow label="Max tool iters" value={String(agent.max_tool_iterations)} colors={colors} />
                      <View style={[styles.divider, { backgroundColor: colors.border }]} />
                    </>
                  ) : null}
                  <InfoRow label="Workspace" value={agent.workspace || "—"} mono colors={colors} />
                </View>
              )}

              {tab === "overview" && agent.memory_enabled && (
                <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Memory</Text>
                  <InfoRow label="Embedding provider" value={agent.embedding_provider ?? "—"} colors={colors} />
                  <View style={[styles.divider, { backgroundColor: colors.border }]} />
                  <InfoRow label="Embedding model" value={agent.embedding_model ?? "—"} colors={colors} />
                </View>
              )}

              {tab === "overview" && (
                <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Thao tác nhanh</Text>
                  <View style={styles.actionsRow}>
                    {[
                      { icon: "chatbubble-outline" as const, label: "Chat", color: colors.primary, onPress: () => {} },
                      { icon: "search-outline" as const, label: "Traces", color: "#60a5fa", onPress: () => router.push("/traces") },
                      { icon: "library-outline" as const, label: "Memory", color: "#a78bfa", onPress: () => router.push("/memory") },
                    ].map((a) => (
                      <TouchableOpacity
                        key={a.label}
                        style={[styles.actionBtn, { backgroundColor: a.color + "15", borderColor: a.color + "30" }]}
                        onPress={a.onPress}
                        activeOpacity={0.7}
                      >
                        <Ionicons name={a.icon} size={16} color={a.color} />
                        <Text style={[styles.actionLabel, { color: a.color }]}>{a.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {tab === "files" && (
                <View>
                  {files.length === 0 ? (
                    <View style={styles.emptyWrap}>
                      <Ionicons name="document-text-outline" size={36} color={colors.mutedForeground} />
                      <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Không có bootstrap files</Text>
                    </View>
                  ) : (
                    files.map((f, i) => (
                      <View key={i} style={[styles.fileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={styles.fileHeader}>
                          <Ionicons name="document-outline" size={16} color={colors.primary} />
                          <Text style={[styles.filePath, { color: colors.foreground }]}>{f.path}</Text>
                          {f.size != null && (
                            <Text style={[styles.fileSize, { color: colors.mutedForeground }]}>
                              {f.size > 1024 ? `${(f.size / 1024).toFixed(1)}KB` : `${f.size}B`}
                            </Text>
                          )}
                        </View>
                        <Text style={[styles.fileContent, { color: colors.mutedForeground, backgroundColor: colors.secondary }]} numberOfLines={6}>
                          {f.content}
                        </Text>
                      </View>
                    ))
                  )}
                </View>
              )}

              {tab === "config" && (
                <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Raw Config</Text>
                  <Text style={[styles.rawJson, { color: colors.mutedForeground }]}>
                    {JSON.stringify(agent, null, 2)}
                  </Text>
                </View>
              )}
            </ScrollView>
          )}

          {tab === "sessions" && (
            <FlatList
              data={agentSessions}
              keyExtractor={(s) => s.key}
              contentContainerStyle={[styles.tabContentInner, { paddingBottom: insets.bottom + 40 }]}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={() =>
                sessLoading ? (
                  <View style={styles.emptyWrap}>
                    <ActivityIndicator color={colors.primary} />
                    <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Đang tải...</Text>
                  </View>
                ) : (
                  <View style={styles.emptyWrap}>
                    <Ionicons name="chatbubbles-outline" size={36} color={colors.mutedForeground} />
                    <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Chưa có phiên nào</Text>
                  </View>
                )
              }
              renderItem={({ item }) => {
                const channelIcon = CHANNEL_ICONS[item.channel ?? ""] ?? "chatbubble-outline";
                return (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => router.push(`/chat/${encodeURIComponent(item.key)}`)}
                    style={[styles.sessionRow, { backgroundColor: colors.card, borderColor: colors.border }]}
                  >
                    <View style={[styles.sessionAvatar, { backgroundColor: colors.primary + "18" }]}>
                      <Ionicons name={channelIcon} size={16} color={colors.primary} />
                    </View>
                    <View style={styles.sessionInfo}>
                      <Text style={[styles.sessionKey, { color: colors.foreground }]} numberOfLines={1}>
                        {item.label ?? item.key}
                      </Text>
                      <Text style={[styles.sessionMeta, { color: colors.mutedForeground }]}>
                        {item.messageCount} tin • {(item.inputTokens ?? 0) + (item.outputTokens ?? 0)} tokens
                        {item.updated ? ` • ${formatRelative(item.updated)}` : ""}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => deleteSession(item.key)}
                      style={[styles.deleteBtn, { backgroundColor: colors.destructive + "15" }]}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="trash-outline" size={14} color={colors.destructive} />
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingBottom: 10, gap: 8 },
  backBtn: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 17, fontFamily: "Inter_600SemiBold", letterSpacing: -0.2 },
  iconBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  errorBanner: { marginHorizontal: 16, marginBottom: 8, borderRadius: 10, borderWidth: 1, padding: 10 },
  errorText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  identityCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 18, borderWidth: 1, marginBottom: 10 },
  agentAvatar: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  identityInfo: { flex: 1 },
  agentName: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  agentKey: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  identityRight: { gap: 5, alignItems: "flex-end" },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  defaultBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  defaultText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  quickRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, marginBottom: 14 },
  quickCard: { flex: 1, flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 12, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 8 },
  quickLabel: { fontSize: 11, fontFamily: "Inter_400Regular", flex: 1 },
  tabRow: { borderBottomWidth: StyleSheet.hairlineWidth, marginBottom: 0 },
  tab: { paddingHorizontal: 4, paddingVertical: 10, marginRight: 20 },
  tabText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  tabContent: { flex: 1 },
  tabContentInner: { padding: 16, gap: 14 },
  section: { borderRadius: 18, borderWidth: 1, padding: 16 },
  sectionTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 12 },
  description: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18, marginBottom: 12, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 0 },
  fileCard: { borderRadius: 16, borderWidth: 1, padding: 14, gap: 10, marginBottom: 10 },
  fileHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  filePath: { flex: 1, fontSize: 13, fontFamily: "Inter_600SemiBold" },
  fileSize: { fontSize: 11, fontFamily: "Inter_400Regular" },
  fileContent: { fontSize: 11, fontFamily: "monospace", padding: 10, borderRadius: 10, lineHeight: 16 },
  rawJson: { fontSize: 10, fontFamily: "monospace", lineHeight: 15 },
  emptyWrap: { alignItems: "center", paddingTop: 40, gap: 10 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  actionsRow: { flexDirection: "row", gap: 10 },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 12, borderWidth: 1, paddingVertical: 10 },
  actionLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  sessionRow: { flexDirection: "row", alignItems: "center", borderRadius: 14, borderWidth: 1, padding: 12, gap: 10, marginBottom: 8 },
  sessionAvatar: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  sessionInfo: { flex: 1 },
  sessionKey: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  sessionMeta: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  deleteBtn: { width: 30, height: 30, borderRadius: 10, alignItems: "center", justifyContent: "center" },
});
