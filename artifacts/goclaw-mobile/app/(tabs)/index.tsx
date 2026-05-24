import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { useAllSessions } from "@/hooks/useSessions";
import { useAgents } from "@/hooks/useAgents";
import { ConversationItem } from "@/components/ConversationItem";
import { SearchBar } from "@/components/SearchBar";
import { EmptyState } from "@/components/EmptyState";

const PROVIDER_COLORS: Record<string, string> = {
  openai: "#10b981",
  anthropic: "#d97706",
  gemini: "#3b82f6",
  google: "#3b82f6",
  groq: "#a78bfa",
  mistral: "#7c3aed",
  ollama: "#22c55e",
  deepseek: "#60a5fa",
};

function AgentPickerModal({
  visible,
  onClose,
  onSelect,
  colors,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (agentId: string, agentKey: string, agentName: string) => void;
  colors: ReturnType<typeof useColors>;
}) {
  const { agents } = useAgents();
  const { connected } = useAuth();
  const insets = useSafeAreaInsets();

  const agentList = agents.map((a) => ({
    id: a.id,
    key: a.agent_key,
    name: a.display_name ?? a.agent_key,
    type: a.agent_type ?? "predefined",
    provider: a.provider ?? "",
    model: a.model ?? "",
    status: a.status ?? "idle",
  }));

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[pickerStyles.container, { backgroundColor: colors.background }]}>
        <View style={[pickerStyles.header, { borderBottomColor: colors.border, paddingTop: insets.top + 12 }]}>
          <View>
            <Text style={[pickerStyles.title, { color: colors.foreground }]}>Chọn Agent</Text>
            <Text style={[pickerStyles.subtitle, { color: colors.mutedForeground }]}>Bắt đầu cuộc trò chuyện mới</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={[pickerStyles.closeBtn, { backgroundColor: colors.muted }]} activeOpacity={0.7}>
            <Ionicons name="close" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        <FlatList
          data={agentList}
          keyExtractor={(a) => a.id}
          contentContainerStyle={[pickerStyles.list, { paddingBottom: insets.bottom + 20 }]}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          ListEmptyComponent={
            <View style={pickerStyles.empty}>
              <Ionicons name="planet-outline" size={36} color={colors.mutedForeground} />
              <Text style={[pickerStyles.emptyText, { color: colors.mutedForeground }]}>Không có agents</Text>
            </View>
          }
          renderItem={({ item }) => {
            const provColor = PROVIDER_COLORS[item.provider] ?? colors.primary;
            return (
              <TouchableOpacity
                style={[pickerStyles.agentRow, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => onSelect(item.id, item.key, item.name)}
                activeOpacity={0.7}
              >
                <View style={[pickerStyles.agentAvatar, { backgroundColor: provColor + "20" }]}>
                  <Ionicons name="planet-outline" size={22} color={provColor} />
                </View>
                <View style={pickerStyles.agentInfo}>
                  <Text style={[pickerStyles.agentName, { color: colors.foreground }]}>{item.name}</Text>
                  <View style={pickerStyles.agentMeta}>
                    <View style={[pickerStyles.typeBadge, { backgroundColor: provColor + "15" }]}>
                      <Text style={[pickerStyles.typeText, { color: provColor }]}>{item.provider || item.type}</Text>
                    </View>
                    {item.model ? (
                      <Text style={[pickerStyles.modelText, { color: colors.mutedForeground }]} numberOfLines={1}>
                        {item.model}
                      </Text>
                    ) : null}
                  </View>
                </View>
                <View style={[pickerStyles.statusDot, { backgroundColor: item.status === "active" ? "#22c55e" : "#a1a1aa" }]} />
                <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
            );
          }}
        />
      </View>
    </Modal>
  );
}

export default function ChatsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { connected } = useAuth();
  const { sessions, loading: sessionsLoading, refresh: refreshSessions } = useAllSessions();
  const { agents } = useAgents();
  const [search, setSearch] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = async () => { setRefreshing(true); await refreshSessions?.(); setRefreshing(false); };

  interface DisplayItem {
    id: string;
    agentId: string;
    agentName: string;
    model: string;
    lastMessage: string;
    lastMessageAt: Date;
    unread: number;
    sessionKey?: string;
  }

  const displayItems = useMemo((): DisplayItem[] => {
    return sessions
      .filter((s) => {
        const q = search.toLowerCase();
        return (
          !q ||
          (s.agentName ?? "").toLowerCase().includes(q) ||
          (s.label ?? s.key).toLowerCase().includes(q)
        );
      })
      .map((s) => {
        const agentKey = s.agentName ?? s.key.split(":")[1] ?? "";
        const agentRec = agents.find((a) => a.agent_key === agentKey || a.display_name?.toLowerCase() === agentKey.toLowerCase());
        const rawName = agentRec?.display_name ?? agentKey;
        const displayName = rawName ? rawName.charAt(0).toUpperCase() + rawName.slice(1) : "Agent";
        return ({
        id: s.key,
        agentId: s.key.split(":")[1] ?? "",
        agentName: displayName,
        model: s.model ?? "",
        lastMessage: s.label ?? `${s.messageCount} tin nhắn`,
        lastMessageAt: new Date(s.updated),
        unread: 0,
        sessionKey: s.key,
      });
      });
  }, [sessions, search, agents]);

  const handleSelectAgent = (agentId: string, agentKey: string, agentName: string) => {
    setShowPicker(false);
    const uid = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const sessionKey = `agent:${agentKey}:ws:direct:${uid}`;
    router.push(`/chat/${encodeURIComponent(sessionKey)}`);
  };

  const topPad = insets.top;
  const isLoading = sessionsLoading;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <View style={styles.headerLeft}>
          <Text style={[styles.title, { color: colors.foreground }]}>Chats</Text>
          {connected && (
            <View style={[styles.liveTag, { backgroundColor: colors.success + "20", borderColor: colors.success + "40" }]}>
              <View style={[styles.liveDot, { backgroundColor: colors.success }]} />
              <Text style={[styles.liveText, { color: colors.success }]}>Live</Text>
            </View>
          )}
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: colors.muted }]}
            onPress={() => router.push("/login")}
            activeOpacity={0.7}
          >
            <Ionicons name={connected ? "cloud-done-outline" : "cloud-offline-outline"} size={18} color={connected ? colors.success : colors.mutedForeground} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: colors.muted }]}
            onPress={() => setShowPicker(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="create-outline" size={18} color={colors.foreground} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchWrap}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Tìm cuộc trò chuyện..." />
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Đang tải sessions...</Text>
        </View>
      ) : displayItems.length === 0 ? (
        <EmptyState
          icon="chatbubbles-outline"
          title={search ? "Không tìm thấy" : "Chưa có cuộc trò chuyện"}
          subtitle={search ? "Thử từ khóa khác" : connected ? "Nhấn + để bắt đầu chat với agent" : "Kết nối với máy chủ để xem sessions thật"}
        />
      ) : (
        <FlatList
          data={displayItems}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ConversationItem
              conversation={item}
              onPress={() => router.push(`/chat/${item.id}`)}
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
        />
      )}

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary, bottom: insets.bottom + 84 }]}
        activeOpacity={0.85}
        onPress={() => setShowPicker(true)}
      >
        <Ionicons name="add" size={26} color="#fff" />
      </TouchableOpacity>

      <AgentPickerModal
        visible={showPicker}
        onClose={() => setShowPicker(false)}
        onSelect={handleSelectAgent}
        colors={colors}
      />
    </View>
  );
}

const pickerStyles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  title: { fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  subtitle: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", marginTop: 2 },
  list: { paddingHorizontal: 16, paddingTop: 16 },
  agentRow: { flexDirection: "row", alignItems: "center", borderRadius: 18, borderWidth: 1, padding: 14, gap: 12 },
  agentAvatar: { width: 46, height: 46, borderRadius: 16, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  agentInfo: { flex: 1, gap: 4 },
  agentName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  agentMeta: { flexDirection: "row", alignItems: "center", gap: 6 },
  typeBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  typeText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  modelText: { fontSize: 11, fontFamily: "Inter_400Regular", flex: 1 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  empty: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  liveTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  liveDot: { width: 5, height: 5, borderRadius: 3 },
  liveText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  iconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  searchWrap: { marginBottom: 4 },
  list: { paddingBottom: 130 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  loadingText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  fab: {
    position: "absolute",
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#f97316",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
});
