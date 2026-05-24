import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
import { Methods } from "@/lib/api/protocol";

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
  const [search, setSearch] = useState("");
  const topPad = insets.top;

  const { sessions: liveSessions, total, loading, error, refresh, deleteSession, labelSession } = useSessionsHistory(agentFilter);
  const [renaming, setRenaming] = useState<{ key: string; current: string } | null>(null);
  const [renameText, setRenameText] = useState("");
  const [previewing, setPreviewing] = useState<string | null>(null);
  const [previewMsgs, setPreviewMsgs] = useState<Array<{ role: string; content: string; created_at?: string }>>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const { ws } = useAuth();
  const baseSessions = liveSessions.filter((s) => !agentFilter || s.agentName?.toLowerCase().includes(agentFilter.toLowerCase()));

  const sessions = search
    ? baseSessions.filter((s) => {
        const q = search.toLowerCase();
        return (s.label ?? s.key).toLowerCase().includes(q) ||
          (s.agentName ?? "").toLowerCase().includes(q) ||
          (s.model ?? "").toLowerCase().includes(q) ||
          (s.channel ?? "").toLowerCase().includes(q);
      })
    : baseSessions;

  const agentOptions = [
    { id: undefined, label: "Tất cả" },
    ...agents.map((a) => ({ id: a.id, label: a.display_name ?? a.id })),
  ];

  const handlePreview = async (session: SessionInfo) => {
    setPreviewing(session.key);
    setPreviewMsgs([]);
    if (!ws?.isConnected) return;
    setPreviewLoading(true);
    try {
      const res = await ws.call<{ messages: Array<{ role: string; content: string; created_at?: string }>; count: number }>(
        Methods.SESSIONS_PREVIEW,
        { sessionKey: session.key, limit: 5 },
      );
      setPreviewMsgs(res.messages ?? []);
    } catch {
      setPreviewMsgs([]);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleRename = (session: SessionInfo) => {
    setRenaming({ key: session.key, current: session.label ?? "" });
    setRenameText(session.label ?? "");
  };

  const handleRenameConfirm = async () => {
    if (!renaming) return;
    await labelSession?.(renaming.key, renameText);
    setRenaming(null);
  };

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

      {/* Inline search bar */}
      <View style={[styles.searchRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Ionicons name="search-outline" size={14} color={colors.mutedForeground} />
        <TextInput
          style={[styles.searchInput, { color: colors.foreground }]}
          value={search}
          onChangeText={setSearch}
          placeholder="Tìm theo tên, agent, model..."
          placeholderTextColor={colors.mutedForeground}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")} activeOpacity={0.7}>
            <Ionicons name="close-circle" size={14} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}
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
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterRow}>
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

      {/* Preview Modal */}
      <Modal visible={!!previewing} presentationStyle="pageSheet" animationType="slide" onRequestClose={() => setPreviewing(null)}>
        <View style={[styles.previewModal, { backgroundColor: colors.background }]}>
          <View style={[styles.previewHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setPreviewing(null)} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={[styles.previewTitle, { color: colors.foreground }]}>Xem trước Session</Text>
            <TouchableOpacity
              onPress={() => { setPreviewing(null); if (previewing) router.push(`/chat/${previewing}`); }}
              activeOpacity={0.7}
            >
              <Text style={[styles.previewOpenBtn, { color: colors.primary }]}>Mở →</Text>
            </TouchableOpacity>
          </View>
          {previewLoading ? (
            <View style={styles.previewLoading}>
              <ActivityIndicator color={colors.primary} />
              <Text style={[styles.previewLoadingText, { color: colors.mutedForeground }]}>Đang tải...</Text>
            </View>
          ) : previewMsgs.length === 0 ? (
            <View style={styles.previewLoading}>
              <Ionicons name="chatbubbles-outline" size={36} color={colors.mutedForeground} />
              <Text style={[styles.previewLoadingText, { color: colors.mutedForeground }]}>
                {connected ? "Không có tin nhắn preview" : "Kết nối server để xem preview"}
              </Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.previewContent} showsVerticalScrollIndicator={false}>
              <Text style={[styles.previewHint, { color: colors.mutedForeground }]}>
                5 tin nhắn đầu tiên
              </Text>
              {previewMsgs.map((msg, i) => {
                const isUser = msg.role === "user";
                return (
                  <View key={i} style={[styles.previewMsg, isUser ? styles.previewMsgUser : styles.previewMsgAssistant]}>
                    <View style={[styles.previewBubble, {
                      backgroundColor: isUser ? colors.primary + "20" : colors.card,
                      borderColor: isUser ? colors.primary + "40" : colors.border,
                      alignSelf: isUser ? "flex-end" : "flex-start",
                    }]}>
                      <Text style={[styles.previewRole, { color: isUser ? colors.primary : colors.mutedForeground }]}>
                        {isUser ? "Bạn" : "Agent"}
                      </Text>
                      <Text style={[styles.previewText, { color: colors.foreground }]} numberOfLines={6}>
                        {msg.content}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>
      </Modal>

      {/* Rename Modal */}
      <Modal visible={!!renaming} transparent animationType="fade" onRequestClose={() => setRenaming(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Đặt tên session</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.foreground }]}
              value={renameText}
              onChangeText={setRenameText}
              placeholder="Nhập tên session..."
              placeholderTextColor={colors.mutedForeground}
              autoFocus
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity onPress={() => setRenaming(null)} style={[styles.modalBtn, { backgroundColor: colors.muted }]} activeOpacity={0.7}>
                <Text style={[styles.modalBtnText, { color: colors.mutedForeground }]}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleRenameConfirm} style={[styles.modalBtn, { backgroundColor: colors.primary }]} activeOpacity={0.7}>
                <Text style={[styles.modalBtnText, { color: "#fff" }]}>Lưu</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <FlatList
        data={sessions}
        keyExtractor={(s) => s.key}
        renderItem={({ item }) => {
          const chCfg = CHANNEL_ICONS[item.channel ?? "web"] ?? CHANNEL_ICONS.web;
          const totalTok = (item.inputTokens ?? 0) + (item.outputTokens ?? 0);
          return (
            <TouchableOpacity
              style={[styles.sessionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push(`/chat/${item.key}`)}
              onLongPress={() => handleRename(item)}
              delayLongPress={400}
              activeOpacity={0.8}
            >
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
                <View style={styles.cardActions}>
                  <TouchableOpacity
                    onPress={() => handlePreview(item)}
                    style={styles.actionBtn}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="eye-outline" size={15} color={colors.mutedForeground} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleRename(item)}
                    style={styles.actionBtn}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="pencil-outline" size={15} color={colors.mutedForeground} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDelete(item)}
                    style={styles.actionBtn}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="trash-outline" size={15} color={colors.destructive} />
                  </TouchableOpacity>
                </View>
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
            </TouchableOpacity>
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
  filterScroll: { flexGrow: 0, flexShrink: 0 },
  filterRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 5, gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1, alignSelf: "flex-start" },
  chipText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  errorBanner: { marginHorizontal: 16, marginBottom: 6, borderRadius: 10, padding: 10 },
  errorText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  list: { paddingHorizontal: 14, paddingTop: 8 },
  searchRow: { flexDirection: "row", alignItems: "center", marginHorizontal: 16, marginBottom: 10, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, height: 38, gap: 8 },
  searchInput: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular" },
  sessionCard: { borderRadius: 18, borderWidth: 1, overflow: "hidden" },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  sessionIcon: { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  sessionInfo: { flex: 1 },
  sessionLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  sessionMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  agentName: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  metaDot: { fontSize: 11 },
  modelName: { fontSize: 11, fontFamily: "Inter_400Regular", flex: 1 },
  cardActions: { flexDirection: "row", alignItems: "center", gap: 4 },
  actionBtn: { padding: 6 },
  deleteBtn: { padding: 6 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  modalBox: { width: "100%", borderRadius: 20, borderWidth: 1, padding: 20, gap: 14 },
  modalTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  modalInput: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, fontFamily: "Inter_400Regular" },
  modalBtns: { flexDirection: "row", gap: 10 },
  modalBtn: { flex: 1, borderRadius: 12, paddingVertical: 11, alignItems: "center" },
  modalBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  cardStats: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth },
  statPair: { flexDirection: "row", alignItems: "center", gap: 4 },
  statVal: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  statLbl: { fontSize: 10, fontFamily: "Inter_400Regular" },
  updatedAt: { fontSize: 11, fontFamily: "Inter_400Regular", marginLeft: "auto" },
  emptyWrap: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  previewModal: { flex: 1 },
  previewHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, paddingTop: 20, borderBottomWidth: 1 },
  previewTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  previewOpenBtn: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  previewLoading: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  previewLoadingText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  previewContent: { padding: 16, gap: 8 },
  previewHint: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center", marginBottom: 8 },
  previewMsg: { flexDirection: "row" },
  previewMsgUser: { justifyContent: "flex-end" },
  previewMsgAssistant: { justifyContent: "flex-start" },
  previewBubble: { maxWidth: "80%", borderRadius: 14, borderWidth: 1, padding: 10, gap: 4 },
  previewRole: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  previewText: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
});
