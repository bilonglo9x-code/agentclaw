import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
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
import { useAuth } from "@/context/AuthContext";

interface PendingMessageGroup {
  channel_name: string;
  history_key: string;
  group_title?: string;
  message_count: number;
  has_summary: boolean;
  last_activity: string;
}

interface PendingMessage {
  id: string;
  role: string;
  content: string;
  created_at: string;
}

const CHANNEL_ICONS: Record<string, { icon: keyof typeof Ionicons["glyphMap"]; color: string }> = {
  telegram: { icon: "paper-plane-outline", color: "#2AABEE" },
  discord: { icon: "logo-discord", color: "#5865F2" },
  slack: { icon: "logo-slack", color: "#4A154B" },
  whatsapp: { icon: "logo-whatsapp", color: "#25D366" },
  web: { icon: "globe-outline", color: "#60a5fa" },
  zalo: { icon: "chatbubble-ellipses-outline", color: "#0068ff" },
  mobile: { icon: "phone-portrait-outline", color: "#a78bfa" },
};

function fmtDate(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  if (diff < 60000) return "Vừa xong";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}p trước`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h trước`;
  if (diff < 86400000 * 7) return `${Math.floor(diff / 86400000)} ngày trước`;
  return d.toLocaleDateString("vi", { day: "2-digit", month: "2-digit" });
}

function MessagesModal({
  group,
  colors,
  http,
  onClose,
}: {
  group: PendingMessageGroup;
  colors: ReturnType<typeof useColors>;
  http: ReturnType<typeof useAuth>["http"];
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<PendingMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!http) return;
    setLoading(true);
    http
      .get<{ messages: PendingMessage[] }>("/v1/pending-messages/messages", {
        channel: group.channel_name,
        key: group.history_key,
      })
      .then((r) => setMessages(r.messages ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [http, group.channel_name, group.history_key]);

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[msgStyles.container, { backgroundColor: colors.background }]}>
        <View style={[msgStyles.header, { borderBottomColor: colors.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[msgStyles.title, { color: colors.foreground }]} numberOfLines={1}>
              {group.group_title || group.history_key}
            </Text>
            <Text style={[msgStyles.subtitle, { color: colors.mutedForeground }]}>
              {group.channel_name} · {group.message_count} tin nhắn
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} style={[msgStyles.closeBtn, { backgroundColor: colors.muted }]} activeOpacity={0.7}>
            <Ionicons name="close" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>
        {loading ? (
          <View style={msgStyles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : messages.length === 0 ? (
          <View style={msgStyles.center}>
            <Text style={[msgStyles.empty, { color: colors.mutedForeground }]}>Không có tin nhắn</Text>
          </View>
        ) : (
          <FlatList
            data={messages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={{ padding: 16, gap: 10 }}
            renderItem={({ item }) => (
              <View
                style={[
                  msgStyles.msgBubble,
                  {
                    backgroundColor: item.role === "user" ? colors.primary + "18" : colors.card,
                    borderColor: colors.border,
                    alignSelf: item.role === "user" ? "flex-end" : "flex-start",
                  },
                ]}
              >
                <Text style={[msgStyles.msgRole, { color: colors.mutedForeground }]}>
                  {item.role === "user" ? "Người dùng" : item.role}
                </Text>
                <Text style={[msgStyles.msgContent, { color: colors.foreground }]} selectable>
                  {item.content}
                </Text>
                <Text style={[msgStyles.msgTime, { color: colors.mutedForeground }]}>
                  {fmtDate(item.created_at)}
                </Text>
              </View>
            )}
          />
        )}
      </View>
    </Modal>
  );
}

const msgStyles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 20, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth, gap: 10 },
  title: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  subtitle: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  closeBtn: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { fontSize: 14, fontFamily: "Inter_400Regular" },
  msgBubble: { maxWidth: "85%", borderRadius: 12, borderWidth: 1, padding: 12, gap: 4 },
  msgRole: { fontSize: 10, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5 },
  msgContent: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  msgTime: { fontSize: 10, fontFamily: "Inter_400Regular" },
});

export default function PendingMessagesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { http, connected } = useAuth();
  const [groups, setGroups] = useState<PendingMessageGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<PendingMessageGroup | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const topPad = insets.top;

  const loadGroups = useCallback(async () => {
    if (!http || !connected) return;
    setLoading(true);
    try {
      const res = await http.get<{ groups: PendingMessageGroup[] }>("/v1/pending-messages");
      setGroups(res.groups ?? []);
    } catch {}
    finally { setLoading(false); }
  }, [http, connected]);

  useEffect(() => {
    loadGroups();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [loadGroups]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadGroups();
    setRefreshing(false);
  };

  const handleCompact = async (group: PendingMessageGroup) => {
    if (!http) return;
    const key = `${group.channel_name}/${group.history_key}`;
    setActionLoading(key);
    try {
      await http.post("/v1/pending-messages/compact", {
        channel_name: group.channel_name,
        history_key: group.history_key,
      });
      pollRef.current = setInterval(() => loadGroups(), 5000);
      setTimeout(() => loadGroups(), 2000);
      setTimeout(() => {
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
        setActionLoading(null);
      }, 120_000);
    } catch {
      setActionLoading(null);
    }
  };

  const handleClear = (group: PendingMessageGroup) => {
    Alert.alert(
      "Xóa nhóm tin nhắn",
      `Xóa tất cả tin nhắn của "${group.group_title || group.history_key}"?`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: async () => {
            if (!http) return;
            const key = `${group.channel_name}/${group.history_key}`;
            setActionLoading(key);
            try {
              await http.delete(
                `/v1/pending-messages?channel=${encodeURIComponent(group.channel_name)}&key=${encodeURIComponent(group.history_key)}`,
              );
              await loadGroups();
            } catch {}
            finally { setActionLoading(null); }
          },
        },
      ],
    );
  };

  const channelInfo = (ch: string) => CHANNEL_ICONS[ch] ?? { icon: "chatbubble-outline" as const, color: "#a1a1aa" };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 4, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>Inbox Pending</Text>
        <TouchableOpacity
          onPress={loadGroups}
          style={[styles.iconBtn, { backgroundColor: colors.muted }]}
          activeOpacity={0.7}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons name="refresh-outline" size={15} color={colors.mutedForeground} />
          )}
        </TouchableOpacity>
      </View>

      {/* Info banner */}
      <View style={[styles.infoBanner, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Ionicons name="information-circle-outline" size={14} color={colors.mutedForeground} />
        <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
          Tin nhắn từ channel chờ xử lý. Compact để tóm tắt bằng AI trước khi gửi đến agent.
        </Text>
      </View>

      {!connected ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={40} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Chưa kết nối server</Text>
        </View>
      ) : (
        <FlatList
          style={{ flex: 1 }}
          data={groups}
          keyExtractor={(g) => `${g.channel_name}/${g.history_key}`}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
          contentContainerStyle={{ paddingBottom: insets.bottom + 40, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item: g }) => {
            const rowKey = `${g.channel_name}/${g.history_key}`;
            const busy = actionLoading === rowKey;
            const { icon, color } = channelInfo(g.channel_name);
            return (
              <TouchableOpacity
                style={[styles.groupRow, { borderBottomColor: colors.border }]}
                onPress={() => setSelectedGroup(g)}
                activeOpacity={0.8}
              >
                <View style={[styles.channelIcon, { backgroundColor: color + "20" }]}>
                  <Ionicons name={icon} size={18} color={color} />
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={[styles.groupTitle, { color: colors.foreground }]} numberOfLines={1}>
                    {g.group_title || g.history_key}
                  </Text>
                  <View style={styles.groupMeta}>
                    <Text style={[styles.channelLabel, { color: color }]}>{g.channel_name}</Text>
                    <Text style={[styles.dot, { color: colors.mutedForeground }]}>·</Text>
                    <Ionicons name="chatbubble-outline" size={11} color={colors.mutedForeground} />
                    <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{g.message_count}</Text>
                    <Text style={[styles.dot, { color: colors.mutedForeground }]}>·</Text>
                    <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{fmtDate(g.last_activity)}</Text>
                  </View>
                </View>
                {g.has_summary ? (
                  <View style={[styles.badge, { backgroundColor: "#22c55e20" }]}>
                    <Text style={[styles.badgeText, { color: "#22c55e" }]}>Compact</Text>
                  </View>
                ) : (
                  <View style={[styles.badge, { backgroundColor: colors.secondary }]}>
                    <Text style={[styles.badgeText, { color: colors.mutedForeground }]}>Raw</Text>
                  </View>
                )}
                <View style={styles.actionRow}>
                  {busy ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <>
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: g.has_summary ? colors.muted : "#60a5fa20" }]}
                        onPress={() => handleCompact(g)}
                        disabled={g.has_summary || busy}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="sparkles-outline" size={14} color={g.has_summary ? colors.mutedForeground : "#60a5fa"} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: "#ef444415" }]}
                        onPress={() => handleClear(g)}
                        disabled={busy}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="trash-outline" size={14} color="#ef4444" />
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.center}>
                <Ionicons name="mail-open-outline" size={44} color={colors.mutedForeground} />
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Inbox trống</Text>
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                  Không có tin nhắn nào đang chờ xử lý
                </Text>
              </View>
            ) : null
          }
        />
      )}

      {selectedGroup && (
        <MessagesModal
          group={selectedGroup}
          colors={colors}
          http={http}
          onClose={() => setSelectedGroup(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth, gap: 8 },
  backBtn: { padding: 4 },
  title: { flex: 1, fontSize: 17, fontFamily: "Inter_600SemiBold" },
  iconBtn: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  infoBanner: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginHorizontal: 16, marginVertical: 10, borderRadius: 10, borderWidth: 1, padding: 10 },
  infoText: { flex: 1, fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60, gap: 10 },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  groupRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 },
  channelIcon: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  groupTitle: { fontSize: 14, fontFamily: "Inter_500Medium" },
  groupMeta: { flexDirection: "row", alignItems: "center", gap: 4 },
  channelLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  dot: { fontSize: 10 },
  metaText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  actionRow: { flexDirection: "row", gap: 6 },
  actionBtn: { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center" },
});
