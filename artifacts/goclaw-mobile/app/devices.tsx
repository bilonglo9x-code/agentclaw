import React from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useDevices, PairedDevice, PendingPairing } from "@/hooks/useDevices";
import { useAuth } from "@/context/AuthContext";

const CHANNEL_CONFIG: Record<string, { icon: keyof typeof Ionicons["glyphMap"]; color: string; label: string }> = {
  telegram: { icon: "paper-plane-outline", color: "#2AABEE", label: "Telegram" },
  discord: { icon: "logo-discord", color: "#5865F2", label: "Discord" },
  slack: { icon: "logo-slack", color: "#4A154B", label: "Slack" },
  whatsapp: { icon: "logo-whatsapp", color: "#25D366", label: "WhatsApp" },
  web: { icon: "globe-outline", color: "#60a5fa", label: "Web" },
  zalo: { icon: "chatbubble-ellipses-outline", color: "#0068ff", label: "Zalo" },
  feishu: { icon: "logo-tiktok", color: "#06b6d4", label: "Feishu" },
};

function fmtDate(iso?: string): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return "Vừa xong";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m trước`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h trước`;
  if (diff < 86400000 * 7) return `${Math.floor(diff / 86400000)} ngày trước`;
  return new Date(iso).toLocaleDateString("vi", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function PendingCard({ item, colors, onApprove, onDeny }: { item: PendingPairing; colors: ReturnType<typeof useColors>; onApprove: (code: string) => void; onDeny: (code: string) => void }) {
  const chCfg = CHANNEL_CONFIG[item.channel] ?? CHANNEL_CONFIG.web;
  return (
    <View style={[styles.pendingCard, { backgroundColor: "#f97316" + "10", borderColor: "#f97316" + "30" }]}>
      <View style={[styles.deviceIcon, { backgroundColor: chCfg.color + "18" }]}>
        <Ionicons name={chCfg.icon} size={20} color={chCfg.color} />
      </View>
      <View style={styles.deviceInfo}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={[styles.deviceTitle, { color: colors.foreground }]} numberOfLines={1}>{item.sender_id}</Text>
          <View style={[styles.channelBadge, { backgroundColor: "#f97316" + "15", borderColor: "#f97316" + "30" }]}>
            <Text style={[styles.channelText, { color: "#f97316" }]}>Chờ duyệt</Text>
          </View>
        </View>
        <View style={styles.deviceMeta}>
          <View style={[styles.channelBadge, { backgroundColor: chCfg.color + "15", borderColor: chCfg.color + "30" }]}>
            <Text style={[styles.channelText, { color: chCfg.color }]}>{chCfg.label}</Text>
          </View>
          {item.code && <Text style={[styles.chatId, { color: colors.mutedForeground, fontFamily: "monospace" }]}>{item.code}</Text>}
          {item.created_at && <Text style={[styles.pairedAt, { color: colors.mutedForeground }]}>{fmtDate(item.created_at)}</Text>}
        </View>
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <TouchableOpacity
          onPress={() => onDeny(item.code)}
          style={[styles.unpairBtn, { backgroundColor: "#ef444415", borderColor: "#ef444430" }]}
          activeOpacity={0.7}
        >
          <Ionicons name="close-outline" size={16} color="#ef4444" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => onApprove(item.code)}
          style={[styles.unpairBtn, { backgroundColor: "#22c55e15", borderColor: "#22c55e30" }]}
          activeOpacity={0.7}
        >
          <Ionicons name="checkmark-outline" size={16} color="#22c55e" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function DeviceCard({ item, colors, onUnpair }: { item: PairedDevice; colors: ReturnType<typeof useColors>; onUnpair: (id: string) => void }) {
  const chCfg = CHANNEL_CONFIG[item.channel] ?? CHANNEL_CONFIG.web;
  return (
    <View style={[styles.deviceCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.deviceIcon, { backgroundColor: chCfg.color + "18" }]}>
        <Ionicons name={chCfg.icon} size={20} color={chCfg.color} />
      </View>
      <View style={styles.deviceInfo}>
        <Text style={[styles.deviceTitle, { color: colors.foreground }]} numberOfLines={1}>
          {item.name ?? chCfg.label + " · " + item.sender_id.slice(-8)}
        </Text>
        <View style={styles.deviceMeta}>
          <View style={[styles.channelBadge, { backgroundColor: chCfg.color + "15", borderColor: chCfg.color + "30" }]}>
            <Text style={[styles.channelText, { color: chCfg.color }]}>{chCfg.label}</Text>
          </View>
          {item.chat_id && (
            <Text style={[styles.chatId, { color: colors.mutedForeground }]}>#{item.chat_id.slice(0, 8)}</Text>
          )}
          <Text style={[styles.pairedAt, { color: colors.mutedForeground }]}>{fmtDate(item.paired_at)}</Text>
        </View>
      </View>
      <TouchableOpacity
        onPress={() => onUnpair(item.sender_id)}
        style={[styles.unpairBtn, { backgroundColor: colors.destructive + "15", borderColor: colors.destructive + "30" }]}
        activeOpacity={0.7}
      >
        <Ionicons name="unlink-outline" size={14} color={colors.destructive} />
      </TouchableOpacity>
    </View>
  );
}

export default function DevicesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { connected } = useAuth();
  const topPad = insets.top;

  const { devices, pending, loading, error, refresh, approvePairing, denyPairing, revokePairing } = useDevices();

  const handleApprove = (code: string) => {
    Alert.alert("Duyệt ghép thiết bị", "Cho phép thiết bị này kết nối?", [
      { text: "Hủy", style: "cancel" },
      { text: "Đồng ý", onPress: () => approvePairing(code) },
    ]);
  };

  const handleDeny = (code: string) => {
    Alert.alert("Từ chối ghép thiết bị", "Từ chối yêu cầu này?", [
      { text: "Hủy", style: "cancel" },
      { text: "Từ chối", style: "destructive", onPress: () => denyPairing(code) },
    ]);
  };

  const handleRevoke = (d: PairedDevice) => {
    Alert.alert(
      "Thu hồi kết nối",
      `Gỡ kết nối ${d.sender_id}? Thiết bị sẽ không thể gửi tin nhắn đến agent nữa.`,
      [
        { text: "Hủy", style: "cancel" },
        { text: "Thu hồi", style: "destructive", onPress: () => revokePairing(d.sender_id, d.channel) },
      ],
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 4 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.titleArea}>
          <Text style={[styles.title, { color: colors.foreground }]}>Devices</Text>
          {pending.length > 0 && (
            <View style={[styles.pendingBadge, { backgroundColor: "#f97316" }]}>
              <Text style={styles.pendingBadgeText}>{pending.length}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity onPress={refresh} style={[styles.iconBtn, { backgroundColor: colors.muted }]} activeOpacity={0.7}>
          {loading ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="refresh-outline" size={15} color={colors.mutedForeground} />}
        </TouchableOpacity>
      </View>

      <FlatList
        data={devices}
        keyExtractor={(d) => d.sender_id}
        renderItem={({ item }) => <DeviceCard item={item} colors={colors} onUnpair={() => handleRevoke(item)} />}
        ListHeaderComponent={() => (
          <View style={styles.listHeader}>
            {/* How pairing works */}
            <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
              <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
                Thiết bị ghép bằng cách gửi lệnh đến bot (Telegram, Discord...). Sau khi nhận yêu cầu, duyệt tại đây.
              </Text>
            </View>

            {/* Pending */}
            {pending.length > 0 && (
              <View style={{ gap: 8 }}>
                <Text style={[styles.sectionLabel, { color: "#f97316" }]}>CHỜ DUYỆT ({pending.length})</Text>
                {pending.map((p) => (
                  <PendingCard key={p.code} item={p} colors={colors} onApprove={handleApprove} onDeny={handleDeny} />
                ))}
              </View>
            )}

            {devices.length > 0 && (
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>ĐÃ GHÉP ({devices.length})</Text>
            )}
            {error && (
              <View style={[styles.errorBanner, { backgroundColor: colors.destructive + "15" }]}>
                <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
              </View>
            )}
          </View>
        )}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 40 }]}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          !loading && pending.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Ionicons name="phone-portrait-outline" size={36} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Chưa có thiết bị nào được ghép</Text>
              <Text style={[styles.emptyHint, { color: colors.mutedForeground }]}>Gửi /pair hoặc /start tới bot để ghép</Text>
            </View>
          ) : null
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
  list: { paddingHorizontal: 14, paddingTop: 0 },
  listHeader: { gap: 14, marginBottom: 8 },
  sectionLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8, paddingHorizontal: 2 },
  deviceCard: { flexDirection: "row", alignItems: "center", borderRadius: 16, borderWidth: 1, padding: 14, gap: 12 },
  deviceIcon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  deviceInfo: { flex: 1, gap: 4 },
  deviceTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  deviceMeta: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  channelBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
  channelText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  chatId: { fontSize: 11, fontFamily: "Inter_400Regular" },
  pairedAt: { fontSize: 11, fontFamily: "Inter_400Regular" },
  unpairBtn: { width: 34, height: 34, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  errorBanner: { borderRadius: 10, padding: 10 },
  errorText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  emptyWrap: { alignItems: "center", paddingTop: 30, gap: 10 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  emptyHint: { fontSize: 12, fontFamily: "Inter_400Regular" },
  pendingCard: { flexDirection: "row", alignItems: "center", borderRadius: 16, borderWidth: 1, padding: 14, gap: 12 },
  pendingBadge: { width: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  pendingBadgeText: { color: "#fff", fontSize: 10, fontFamily: "Inter_700Bold" },
  infoCard: { flexDirection: "row", alignItems: "flex-start", gap: 8, borderRadius: 12, borderWidth: 1, padding: 12 },
  infoText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
});
