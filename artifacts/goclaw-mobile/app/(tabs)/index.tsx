import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { useAllSessions } from "@/hooks/useSessions";
import { ConversationItem } from "@/components/ConversationItem";
import { SearchBar } from "@/components/SearchBar";
import { EmptyState } from "@/components/EmptyState";

export default function ChatsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { conversations } = useApp();
  const { connected } = useAuth();
  const { sessions, loading: sessionsLoading } = useAllSessions();
  const [search, setSearch] = useState("");

  const liveSessions = connected && sessions.length > 0;

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
    if (liveSessions) {
      return sessions
        .filter((s) => {
          const q = search.toLowerCase();
          return (
            !q ||
            (s.agentName ?? "").toLowerCase().includes(q) ||
            (s.label ?? s.key).toLowerCase().includes(q)
          );
        })
        .map((s) => ({
          id: s.key,
          agentId: s.key.split(":")[1] ?? "",
          agentName: s.agentName ?? s.key.split(":")[1] ?? "Agent",
          model: s.model ?? "",
          lastMessage: s.label ?? `${s.messageCount} tin nhắn`,
          lastMessageAt: new Date(s.updated),
          unread: 0,
          sessionKey: s.key,
        }));
    }

    return conversations
      .filter(
        (c) =>
          c.agentName.toLowerCase().includes(search.toLowerCase()) ||
          c.lastMessage.toLowerCase().includes(search.toLowerCase()),
      )
      .map((c) => ({ ...c, sessionKey: undefined }));
  }, [liveSessions, sessions, conversations, search]);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const isLoading = connected && sessionsLoading;

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
          subtitle={search ? "Thử từ khóa khác" : connected ? "Bắt đầu chat với một agent" : "Kết nối với máy chủ để xem sessions thật"}
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
        />
      )}

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary, bottom: insets.bottom + 84 }]}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={26} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

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
