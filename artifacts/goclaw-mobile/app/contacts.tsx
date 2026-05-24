import React, { useState } from "react";
import {
  ActivityIndicator,
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
import { useContacts, ChannelContact } from "@/hooks/useContacts";
import { SearchBar } from "@/components/SearchBar";
import { useAuth } from "@/context/AuthContext";

const CHANNEL_ICONS: Record<string, { color: string; icon: keyof typeof Ionicons["glyphMap"] }> = {
  telegram: { color: "#2AABEE", icon: "paper-plane-outline" },
  slack: { color: "#4A154B", icon: "logo-slack" },
  whatsapp: { color: "#25D366", icon: "logo-whatsapp" },
  email: { color: "#f97316", icon: "mail-outline" },
  zalo: { color: "#006AF5", icon: "chatbubble-outline" },
};

const CONTACT_TYPE_COLORS: Record<string, string> = {
  user: "#22c55e",
  group: "#60a5fa",
  topic: "#a78bfa",
};

const MOCK_CONTACTS: ChannelContact[] = [
  { id: "c1", channel_type: "telegram", sender_id: "123456789", display_name: "Nguyen Van An", username: "nguyenvanan", contact_type: "user", peer_kind: "user", first_seen_at: new Date(Date.now() - 86400000 * 30).toISOString(), last_seen_at: new Date(Date.now() - 120000).toISOString() },
  { id: "c2", channel_type: "telegram", sender_id: "-1001234567890", display_name: "Dev Team Group", contact_type: "group", peer_kind: "group", first_seen_at: new Date(Date.now() - 86400000 * 60).toISOString(), last_seen_at: new Date(Date.now() - 86400000).toISOString() },
  { id: "c3", channel_type: "slack", sender_id: "U012AB3CD", display_name: "Tran Thi Bich", username: "ttbich", contact_type: "user", peer_kind: "user", first_seen_at: new Date(Date.now() - 86400000 * 14).toISOString(), last_seen_at: new Date(Date.now() - 240000).toISOString() },
  { id: "c4", channel_type: "email", sender_id: "support@company.com", display_name: "Support Team", contact_type: "user", first_seen_at: new Date(Date.now() - 86400000 * 45).toISOString(), last_seen_at: new Date(Date.now() - 86400000 * 2).toISOString() },
  { id: "c5", channel_type: "whatsapp", sender_id: "+84901234567", display_name: "Le Minh Duc", contact_type: "user", first_seen_at: new Date(Date.now() - 86400000 * 7).toISOString(), last_seen_at: new Date(Date.now() - 60000).toISOString() },
  { id: "c6", channel_type: "telegram", sender_id: "-1009876543210", display_name: "Product Updates Channel", contact_type: "topic", peer_kind: "channel", first_seen_at: new Date(Date.now() - 86400000 * 20).toISOString(), last_seen_at: new Date(Date.now() - 86400000 * 3).toISOString() },
];

const ONLINE_THRESHOLD_MS = 5 * 60 * 1000;

function fmtLastSeen(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return "Đang online";
  if (diff < ONLINE_THRESHOLD_MS) return `${Math.floor(diff / 60000)}m trước`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  return `${Math.floor(diff / 86400000)}d`;
}

function isOnline(iso: string): boolean {
  return Date.now() - new Date(iso).getTime() < ONLINE_THRESHOLD_MS;
}

function getInitials(name?: string): string {
  if (!name) return "?";
  return name.split(" ").map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

export default function ContactsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { connected } = useAuth();
  const [search, setSearch] = useState("");
  const [channelFilter, setChannelFilter] = useState<string | undefined>(undefined);
  const topPad = insets.top;

  const { contacts: liveContacts, total: liveTotal, loading, error, refresh } = useContacts(search, channelFilter);
  const contacts = connected && liveContacts.length > 0
    ? liveContacts
    : MOCK_CONTACTS.filter((c) => {
        if (channelFilter && c.channel_type !== channelFilter) return false;
        if (search) {
          const q = search.toLowerCase();
          return (c.display_name ?? "").toLowerCase().includes(q) ||
            (c.username ?? "").toLowerCase().includes(q) ||
            c.sender_id.includes(q);
        }
        return true;
      });
  const total = connected ? liveTotal : contacts.length;
  const onlineCount = contacts.filter((c) => isOnline(c.last_seen_at)).length;

  const channels = [...new Set(MOCK_CONTACTS.map((c) => c.channel_type))];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 4 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.titleArea}>
          <Text style={[styles.title, { color: colors.foreground }]}>Contacts</Text>
          <Text style={[styles.totalBadge, { color: colors.mutedForeground }]}>{total}</Text>
          {onlineCount > 0 && (
            <View style={styles.onlineRow}>
              <View style={[styles.onlineDot, { backgroundColor: "#22c55e" }]} />
              <Text style={[styles.onlineCount, { color: "#22c55e" }]}>{onlineCount} online</Text>
            </View>
          )}
        </View>
        <TouchableOpacity onPress={refresh} style={[styles.iconBtn, { backgroundColor: colors.muted }]} activeOpacity={0.7}>
          {loading ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="refresh-outline" size={15} color={colors.mutedForeground} />}
        </TouchableOpacity>
      </View>

      <View style={styles.searchWrap}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Tìm contacts..." />
      </View>

      {/* Channel filter pills */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          onPress={() => setChannelFilter(undefined)}
          style={[styles.chip, { backgroundColor: !channelFilter ? colors.primary + "22" : colors.muted, borderColor: !channelFilter ? colors.primary + "55" : colors.border }]}
          activeOpacity={0.7}
        >
          <Text style={[styles.chipText, { color: !channelFilter ? colors.primary : colors.mutedForeground }]}>Tất cả</Text>
        </TouchableOpacity>
        {channels.map((ch) => {
          const cfg = CHANNEL_ICONS[ch];
          const active = channelFilter === ch;
          return (
            <TouchableOpacity
              key={ch}
              onPress={() => setChannelFilter(active ? undefined : ch)}
              style={[styles.chip, { backgroundColor: active ? (cfg?.color ?? colors.primary) + "22" : colors.muted, borderColor: active ? (cfg?.color ?? colors.primary) + "55" : colors.border }]}
              activeOpacity={0.7}
            >
              {cfg && <Ionicons name={cfg.icon} size={12} color={active ? cfg.color : colors.mutedForeground} />}
              <Text style={[styles.chipText, { color: active ? (cfg?.color ?? colors.primary) : colors.mutedForeground }]}>
                {ch}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {error && (
        <View style={[styles.errorBanner, { backgroundColor: colors.destructive + "15" }]}>
          <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
        </View>
      )}

      <FlatList
        data={contacts}
        keyExtractor={(c) => c.id}
        renderItem={({ item }) => {
          const chCfg = CHANNEL_ICONS[item.channel_type] ?? { color: colors.primary, icon: "chatbubble-outline" as const };
          const typeColor = CONTACT_TYPE_COLORS[item.contact_type] ?? colors.mutedForeground;
          const initials = getInitials(item.display_name);
          const online = isOnline(item.last_seen_at);

          return (
            <View style={[styles.contactRow, { borderBottomColor: colors.border }]}>
              {/* Avatar with online ring */}
              <View style={[styles.avatarWrap, online && { borderColor: "#22c55e33", borderWidth: 2 }]}>
                <View style={[styles.avatar, { backgroundColor: chCfg.color + "20" }]}>
                  <Text style={[styles.initials, { color: chCfg.color }]}>{initials}</Text>
                  <View style={[styles.channelBadge, { backgroundColor: chCfg.color }]}>
                    <Ionicons name={chCfg.icon} size={8} color="#fff" />
                  </View>
                </View>
                {online && <View style={[styles.onlineStatus, { backgroundColor: "#22c55e", borderColor: colors.background }]} />}
              </View>

              <View style={styles.contactInfo}>
                <View style={styles.nameRow}>
                  <Text style={[styles.displayName, { color: colors.foreground }]} numberOfLines={1}>
                    {item.display_name ?? item.sender_id}
                  </Text>
                  <View style={[styles.typeBadge, { backgroundColor: typeColor + "20" }]}>
                    <Text style={[styles.typeText, { color: typeColor }]}>{item.contact_type}</Text>
                  </View>
                </View>
                <Text style={[styles.username, { color: colors.mutedForeground }]} numberOfLines={1}>
                  {item.username ? `@${item.username}` : item.sender_id}
                </Text>
              </View>

              <View style={styles.contactRight}>
                <Text style={[styles.lastSeen, { color: online ? "#22c55e" : colors.mutedForeground }]}>
                  {fmtLastSeen(item.last_seen_at)}
                </Text>
                {item.contact_type === "user" && (
                  <TouchableOpacity
                    style={[styles.msgBtn, { backgroundColor: colors.primary + "18", borderColor: colors.primary + "30" }]}
                    onPress={() => router.push(`/chat/new_contact_${item.id}_${Date.now()}`)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="chatbubble-outline" size={12} color={colors.primary} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        }}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="people-outline" size={36} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Không có contacts</Text>
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
  titleArea: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontSize: 20, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  totalBadge: { fontSize: 12, fontFamily: "Inter_400Regular" },
  onlineRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  onlineDot: { width: 5, height: 5, borderRadius: 3 },
  onlineCount: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  iconBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  searchWrap: { paddingHorizontal: 14, marginBottom: 4 },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 14, paddingBottom: 8 },
  chip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  errorBanner: { marginHorizontal: 16, marginBottom: 6, borderRadius: 10, padding: 10 },
  errorText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  list: {},
  contactRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 },
  avatarWrap: { position: "relative", borderRadius: 24, padding: 2 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  initials: { fontSize: 16, fontFamily: "Inter_700Bold" },
  channelBadge: { position: "absolute", bottom: 0, right: 0, width: 16, height: 16, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  onlineStatus: { position: "absolute", bottom: 3, right: 3, width: 10, height: 10, borderRadius: 5, borderWidth: 2 },
  contactInfo: { flex: 1 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  displayName: { fontSize: 15, fontFamily: "Inter_600SemiBold", flex: 1 },
  typeBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  typeText: { fontSize: 9, fontFamily: "Inter_600SemiBold" },
  username: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  contactRight: { alignItems: "flex-end", gap: 6 },
  lastSeen: { fontSize: 10, fontFamily: "Inter_500Medium" },
  msgBtn: { width: 28, height: 28, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  emptyWrap: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
});
