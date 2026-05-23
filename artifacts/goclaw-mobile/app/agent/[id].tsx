import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAgentDetail } from "@/hooks/useAgentDetail";
import { useSessionsHistory } from "@/hooks/useSessionsHistory";
import { useShares } from "@/hooks/useShares";
import { useAuth } from "@/context/AuthContext";
import { useModels } from "@/hooks/useModels";
import { useCreateAgent } from "@/hooks/useCreateAgent";
import { useAgentLinks } from "@/hooks/useAgentLinks";
import { useAgentIdentity } from "@/hooks/useAgentIdentity";

type Tab = "overview" | "files" | "sessions" | "config" | "shares" | "links";

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
  const { connected } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { agent, files, loading, error, refresh } = useAgentDetail(id);
  const { sessions, loading: sessLoading, deleteSession } = useSessionsHistory();
  const { shares, loading: sharesLoading, grantShare, revokeShare } = useShares(id);
  const { links, loading: linksLoading, createLink, deleteLink, updateLink } = useAgentLinks(id);
  const { identity } = useAgentIdentity(id);
  const { models: allModels } = useModels();
  const { updateAgent, saving: savingModel } = useCreateAgent();
  const [tab, setTab] = useState<Tab>("overview");
  const [showShareModal, setShowShareModal] = useState(false);
  const [newUserId, setNewUserId] = useState("");
  const [newRole, setNewRole] = useState<"user" | "admin">("user");
  const [granting, setGranting] = useState(false);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [newLinkTarget, setNewLinkTarget] = useState("");
  const [newLinkEvent, setNewLinkEvent] = useState("run.completed");
  const [newLinkLabel, setNewLinkLabel] = useState("");
  const [creatingLink, setCreatingLink] = useState(false);
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const stCfg = agent ? (STATUS_CONFIG[agent.status] ?? STATUS_CONFIG.active) : STATUS_CONFIG.active;

  const handleExport = useCallback(async () => {
    if (!agent || !connected) {
      Alert.alert("Không khả dụng", "Cần kết nối server để export agent");
      return;
    }
    try {
      const url = `${agent.id ? `/v1/agents/${agent.id}/export` : ""}`;
      await Share.share({
        message: `Export agent: ${agent.name ?? agent.agent_key}\nURL: ${url}`,
        title: `GoClaw — ${agent.name ?? agent.agent_key}`,
      });
    } catch {
      Alert.alert("Lỗi", "Không thể export agent");
    }
  }, [agent, connected]);

  const handleChangeModel = useCallback(async (modelName: string) => {
    if (!agent) return;
    try {
      await updateAgent(agent.id, { model: modelName });
      setShowModelPicker(false);
      refresh();
    } catch {
      Alert.alert("Lỗi", "Không thể đổi model");
    }
  }, [agent, updateAgent, refresh]);

  const agentSessions = sessions.filter(
    (s) => s.agentName === agent?.agent_key || s.agentName === agent?.name,
  );

  const handleGrantShare = async () => {
    if (!newUserId.trim()) return;
    setGranting(true);
    try {
      await grantShare(newUserId.trim(), newRole);
      setShowShareModal(false);
      setNewUserId("");
    } catch (e) {
      Alert.alert("Lỗi", e instanceof Error ? e.message : "Không thể thêm share");
    } finally {
      setGranting(false);
    }
  };

  const TABS: { value: Tab; label: string }[] = [
    { value: "overview", label: "Tổng quan" },
    { value: "files", label: "Files" },
    { value: "sessions", label: `Sessions${agentSessions.length > 0 ? ` (${agentSessions.length})` : ""}` },
    { value: "config", label: "Config" },
    { value: "shares", label: `Shares${shares.length > 0 ? ` (${shares.length})` : ""}` },
    { value: "links", label: `Links${links.length > 0 ? ` (${links.length})` : ""}` },
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

              {tab === "overview" && identity && (
                <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Identity</Text>
                  {identity.bio ? (
                    <Text style={[styles.description, { color: colors.mutedForeground }]}>{identity.bio}</Text>
                  ) : null}
                  {identity.capabilities && identity.capabilities.length > 0 && (
                    <>
                      <Text style={[styles.sectionTitle, { color: colors.mutedForeground, fontSize: 11, letterSpacing: 0.5 }]}>CAPABILITIES</Text>
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4, marginBottom: 8 }}>
                        {identity.capabilities.map((cap) => (
                          <View key={cap} style={[{ paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8, backgroundColor: colors.primary + "18", borderWidth: 1, borderColor: colors.primary + "30" }]}>
                            <Text style={{ fontSize: 11, color: colors.primary, fontFamily: "Inter_500Medium" }}>{cap}</Text>
                          </View>
                        ))}
                      </View>
                    </>
                  )}
                  {identity.version && (
                    <InfoRow label="Version" value={identity.version} mono colors={colors} />
                  )}
                  {identity.public_info && Object.keys(identity.public_info).length > 0 && (
                    <>
                      <View style={[styles.divider, { backgroundColor: colors.border }]} />
                      {Object.entries(identity.public_info).map(([k, v]) => (
                        <React.Fragment key={k}>
                          <InfoRow label={k} value={v} colors={colors} />
                          <View style={[styles.divider, { backgroundColor: colors.border }]} />
                        </React.Fragment>
                      ))}
                    </>
                  )}
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
                      { icon: "chatbubble-outline" as const, label: "Chat", color: colors.primary, onPress: () => {
                        if (!agent) return;
                        const uid = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
                        const key = `agent:${agent.agent_key}:ws:direct:${uid}`;
                        router.push(`/chat/${encodeURIComponent(key)}`);
                      } },
                      { icon: "search-outline" as const, label: "Traces", color: "#60a5fa", onPress: () => router.push("/traces") },
                      { icon: "hardware-chip-outline" as const, label: "Đổi Model", color: "#f59e0b", onPress: () => setShowModelPicker(true) },
                      { icon: "library-outline" as const, label: "Memory", color: "#a78bfa", onPress: () => router.push("/memory") },
                      { icon: "share-outline" as const, label: "Export", color: "#22c55e", onPress: handleExport },
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

          {tab === "links" && (
            <FlatList
              data={links}
              keyExtractor={(l) => l.id}
              contentContainerStyle={[styles.tabContentInner, { paddingBottom: insets.bottom + 40 }]}
              showsVerticalScrollIndicator={false}
              ListHeaderComponent={connected ? (
                <TouchableOpacity
                  onPress={() => setShowLinkModal(true)}
                  style={[styles.addShareBtn, { backgroundColor: colors.primary + "18", borderColor: colors.primary + "40" }]}
                  activeOpacity={0.7}
                >
                  <Ionicons name="git-branch-outline" size={16} color={colors.primary} />
                  <Text style={[styles.addShareText, { color: colors.primary }]}>Thêm Agent Link</Text>
                </TouchableOpacity>
              ) : null}
              ListEmptyComponent={() =>
                linksLoading ? (
                  <View style={styles.emptyWrap}><ActivityIndicator color={colors.primary} /></View>
                ) : (
                  <View style={styles.emptyWrap}>
                    <Ionicons name="git-network-outline" size={36} color={colors.mutedForeground} />
                    <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Chưa có agent link nào</Text>
                    <Text style={[{ fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground, textAlign: "center", paddingHorizontal: 20 }]}>
                      Agent links cho phép agent này trigger agent khác khi có sự kiện xảy ra
                    </Text>
                  </View>
                )
              }
              renderItem={({ item: lnk }) => (
                <View style={[styles.sessionRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={[styles.sessionAvatar, { backgroundColor: lnk.enabled ? colors.primary + "18" : colors.secondary }]}>
                    <Ionicons name="git-branch-outline" size={16} color={lnk.enabled ? colors.primary : colors.mutedForeground} />
                  </View>
                  <View style={styles.sessionInfo}>
                    <Text style={[styles.sessionKey, { color: colors.foreground }]} numberOfLines={1}>
                      {lnk.label ?? `→ ${lnk.to_agent_key ?? lnk.to_agent_id}`}
                    </Text>
                    <Text style={[styles.sessionMeta, { color: colors.mutedForeground }]}>
                      Trigger: <Text style={{ color: colors.primary }}>{lnk.trigger_event}</Text>
                      {lnk.condition ? ` · if ${lnk.condition}` : ""}
                    </Text>
                  </View>
                  <View style={{ flexDirection: "row", gap: 6 }}>
                    <TouchableOpacity
                      onPress={() => updateLink(lnk.id, { enabled: !lnk.enabled })}
                      style={[styles.deleteBtn, { backgroundColor: (lnk.enabled ? "#22c55e" : "#71717a") + "18" }]}
                      activeOpacity={0.7}
                    >
                      <Ionicons name={lnk.enabled ? "pause-outline" : "play-outline"} size={13} color={lnk.enabled ? "#22c55e" : "#71717a"} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => Alert.alert("Xóa link", `Xóa link "${lnk.label ?? lnk.to_agent_key}"?`, [
                        { text: "Hủy", style: "cancel" },
                        { text: "Xóa", style: "destructive", onPress: () => deleteLink(lnk.id) },
                      ])}
                      style={[styles.deleteBtn, { backgroundColor: colors.destructive + "15" }]}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="trash-outline" size={13} color={colors.destructive} />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            />
          )}

          {tab === "shares" && (
            <FlatList
              data={shares}
              keyExtractor={(s) => s.user_id}
              contentContainerStyle={[styles.tabContentInner, { paddingBottom: insets.bottom + 40 }]}
              showsVerticalScrollIndicator={false}
              ListHeaderComponent={connected ? (
                <TouchableOpacity
                  onPress={() => setShowShareModal(true)}
                  style={[styles.addShareBtn, { backgroundColor: colors.primary + "18", borderColor: colors.primary + "40" }]}
                  activeOpacity={0.7}
                >
                  <Ionicons name="person-add-outline" size={16} color={colors.primary} />
                  <Text style={[styles.addShareText, { color: colors.primary }]}>Thêm người dùng</Text>
                </TouchableOpacity>
              ) : null}
              ListEmptyComponent={() =>
                sharesLoading ? (
                  <View style={styles.emptyWrap}>
                    <ActivityIndicator color={colors.primary} />
                  </View>
                ) : (
                  <View style={styles.emptyWrap}>
                    <Ionicons name="share-social-outline" size={36} color={colors.mutedForeground} />
                    <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Chưa được chia sẻ</Text>
                  </View>
                )
              }
              renderItem={({ item }) => (
                <View style={[styles.shareRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={[styles.shareAvatar, { backgroundColor: (item.role === "admin" ? "#f97316" : "#60a5fa") + "20" }]}>
                    <Ionicons name={item.role === "admin" ? "shield-outline" : "person-outline"} size={16} color={item.role === "admin" ? "#f97316" : "#60a5fa"} />
                  </View>
                  <View style={styles.shareInfo}>
                    <Text style={[styles.shareUserId, { color: colors.foreground }]}>{item.user_id}</Text>
                    <View style={[styles.shareRoleBadge, { backgroundColor: (item.role === "admin" ? "#f97316" : "#60a5fa") + "20" }]}>
                      <Text style={[styles.shareRoleText, { color: item.role === "admin" ? "#f97316" : "#60a5fa" }]}>{item.role}</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      Alert.alert("Xóa quyền", `Xóa access của "${item.user_id}"?`, [
                        { text: "Hủy", style: "cancel" },
                        { text: "Xóa", style: "destructive", onPress: () => revokeShare(item.user_id) },
                      ]);
                    }}
                    style={[styles.deleteBtn, { backgroundColor: colors.destructive + "15" }]}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="trash-outline" size={14} color={colors.destructive} />
                  </TouchableOpacity>
                </View>
              )}
            />
          )}
        </>
      )}

      {/* Change Model Modal */}
      <Modal visible={showModelPicker} animationType="slide" transparent onRequestClose={() => setShowModelPicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>Đổi Model AI</Text>
                <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginTop: 2 }}>
                  Hiện tại: {agent?.provider} / <Text style={{ color: colors.primary }}>{agent?.model || "—"}</Text>
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowModelPicker(false)}>
                <Ionicons name="close" size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              {allModels.filter((m) => m.provider === agent?.provider).length === 0 ? (
                <View style={{ padding: 24, alignItems: "center", gap: 8 }}>
                  <Ionicons name="cloud-offline-outline" size={32} color={colors.mutedForeground} />
                  <Text style={{ fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_400Regular", textAlign: "center" }}>
                    {connected ? `Không có model nào cho ${agent?.provider}` : "Kết nối server để xem danh sách model"}
                  </Text>
                </View>
              ) : (
                allModels
                  .filter((m) => m.provider === agent?.provider)
                  .map((m) => {
                    const active = agent?.model === m.name;
                    return (
                      <TouchableOpacity
                        key={m.name}
                        onPress={() => handleChangeModel(m.name)}
                        style={[styles.modelItem, { borderColor: active ? colors.primary + "50" : colors.border, backgroundColor: active ? colors.primary + "10" : "transparent" }]}
                        activeOpacity={0.7}
                        disabled={savingModel}
                      >
                        <View style={{ flex: 1, gap: 2 }}>
                          <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: active ? colors.primary : colors.foreground }}>
                            {m.display_name || m.name}
                          </Text>
                          <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: colors.mutedForeground }}>
                            {m.name}{m.context_window ? ` · ${(m.context_window / 1000).toFixed(0)}k ctx` : ""}
                          </Text>
                          {m.capabilities && m.capabilities.length > 0 && (
                            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 2 }}>
                              {m.capabilities.map((c) => (
                                <View key={c} style={[styles.capBadge, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                                  <Text style={{ fontSize: 10, color: colors.mutedForeground, fontFamily: "Inter_400Regular" }}>{c}</Text>
                                </View>
                              ))}
                            </View>
                          )}
                        </View>
                        {savingModel && active
                          ? <ActivityIndicator size="small" color={colors.primary} />
                          : active
                            ? <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                            : m.is_default
                              ? <View style={[styles.capBadge, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "30" }]}>
                                  <Text style={{ fontSize: 10, color: colors.primary, fontFamily: "Inter_600SemiBold" }}>default</Text>
                                </View>
                              : null}
                      </TouchableOpacity>
                    );
                  })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Add Link Modal */}
      <Modal visible={showLinkModal} transparent animationType="slide" onRequestClose={() => setShowLinkModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Thêm Agent Link</Text>
              <TouchableOpacity onPress={() => setShowLinkModal(false)} activeOpacity={0.7}>
                <Ionicons name="close" size={22} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
            <Text style={{ fontSize: 11, color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginBottom: 8 }}>
              Target Agent ID hoặc agent_key
            </Text>
            <TextInput
              style={[styles.shareInput, { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.foreground }]}
              value={newLinkTarget}
              onChangeText={setNewLinkTarget}
              placeholder="agent_key hoặc agent ID..."
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={{ fontSize: 11, color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 8, marginBottom: 4 }}>
              Trigger event
            </Text>
            <View style={styles.roleRow}>
              {["run.completed", "run.failed", "tool.result"].map((ev) => (
                <TouchableOpacity
                  key={ev}
                  onPress={() => setNewLinkEvent(ev)}
                  style={[styles.roleBtn, { flex: 0, paddingHorizontal: 10, backgroundColor: newLinkEvent === ev ? colors.primary + "20" : colors.secondary, borderColor: newLinkEvent === ev ? colors.primary + "60" : colors.border }]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.roleBtnText, { fontSize: 11, color: newLinkEvent === ev ? colors.primary : colors.mutedForeground }]}>{ev}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={{ fontSize: 11, color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 8, marginBottom: 4 }}>
              Nhãn (tuỳ chọn)
            </Text>
            <TextInput
              style={[styles.shareInput, { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.foreground }]}
              value={newLinkLabel}
              onChangeText={setNewLinkLabel}
              placeholder="Mô tả link này..."
              placeholderTextColor={colors.mutedForeground}
            />
            <TouchableOpacity
              style={[styles.grantBtn, { backgroundColor: colors.primary, opacity: creatingLink || !newLinkTarget.trim() ? 0.6 : 1 }]}
              onPress={async () => {
                if (!newLinkTarget.trim()) return;
                setCreatingLink(true);
                try {
                  await createLink({ toAgentId: newLinkTarget.trim(), triggerEvent: newLinkEvent, label: newLinkLabel.trim() || undefined });
                  setShowLinkModal(false);
                  setNewLinkTarget(""); setNewLinkLabel("");
                } catch (e) {
                  Alert.alert("Lỗi", e instanceof Error ? e.message : "Tạo link thất bại");
                } finally {
                  setCreatingLink(false);
                }
              }}
              disabled={creatingLink || !newLinkTarget.trim()}
              activeOpacity={0.7}
            >
              {creatingLink ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.grantBtnText}>Tạo Link</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Add Share Modal */}
      <Modal visible={showShareModal} transparent animationType="slide" onRequestClose={() => setShowShareModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Thêm người dùng</Text>
              <TouchableOpacity onPress={() => setShowShareModal(false)} activeOpacity={0.7}>
                <Ionicons name="close" size={22} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.shareInput, { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.foreground }]}
              value={newUserId}
              onChangeText={setNewUserId}
              placeholder="User ID..."
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={styles.roleRow}>
              {(["user", "admin"] as const).map((r) => (
                <TouchableOpacity
                  key={r}
                  onPress={() => setNewRole(r)}
                  style={[styles.roleBtn, { backgroundColor: newRole === r ? colors.primary + "20" : colors.secondary, borderColor: newRole === r ? colors.primary + "60" : colors.border }]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.roleBtnText, { color: newRole === r ? colors.primary : colors.mutedForeground }]}>{r}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[styles.grantBtn, { backgroundColor: colors.primary, opacity: granting ? 0.7 : 1 }]}
              onPress={handleGrantShare}
              disabled={granting || !newUserId.trim()}
              activeOpacity={0.7}
            >
              {granting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.grantBtnText}>Cấp quyền</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  addShareBtn: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 14, borderWidth: 1, padding: 13, justifyContent: "center", marginBottom: 12 },
  addShareText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  shareRow: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 14, borderWidth: 1, padding: 12, marginBottom: 8 },
  shareAvatar: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  shareInfo: { flex: 1, gap: 4 },
  shareUserId: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  shareRoleBadge: { alignSelf: "flex-start", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  shareRoleText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.6)" },
  modalBox: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, padding: 20, gap: 14 },
  modelItem: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 6 },
  capBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
  modalContent: { borderRadius: 24, borderWidth: 1, padding: 20, gap: 14, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  modalTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  shareInput: { borderRadius: 12, borderWidth: 1, padding: 13, fontSize: 14, fontFamily: "Inter_400Regular" },
  roleRow: { flexDirection: "row", gap: 10 },
  roleBtn: { flex: 1, alignItems: "center", paddingVertical: 11, borderRadius: 12, borderWidth: 1 },
  roleBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  grantBtn: { borderRadius: 14, paddingVertical: 13, alignItems: "center" },
  grantBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
