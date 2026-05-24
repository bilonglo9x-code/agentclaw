import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { useDevices, PairedDevice } from "@/hooks/useDevices";
import { useAuth } from "@/context/AuthContext";

const MOCK_DEVICES: PairedDevice[] = [
  { sender_id: "tg_123456", channel: "telegram", chat_id: "123456", paired_at: new Date(Date.now() - 86400000 * 5).toISOString(), user_id: "alice" },
  { sender_id: "dc_789012", channel: "discord", chat_id: "789012", paired_at: new Date(Date.now() - 86400000 * 12).toISOString(), user_id: "alice" },
  { sender_id: "wb_aabbcc", channel: "web", paired_at: new Date(Date.now() - 3600000 * 2).toISOString(), user_id: "alice" },
];

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

function PairingCodeCard({
  colors,
  onGenerate,
  onCancel,
  code,
  expiresAt,
  generating,
}: {
  colors: ReturnType<typeof useColors>;
  onGenerate: () => void;
  onCancel: () => void;
  code?: string;
  expiresAt?: string;
  generating?: boolean;
}) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!expiresAt) { setRemaining(0); return; }
    const tick = () => {
      const diff = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
      setRemaining(diff);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  return (
    <View style={[styles.pairingCard, { backgroundColor: colors.card, borderColor: code ? colors.primary + "40" : colors.border }]}>
      <View style={styles.pairingHeader}>
        <Ionicons name="qr-code-outline" size={18} color={colors.primary} />
        <Text style={[styles.pairingTitle, { color: colors.foreground }]}>Ghép thiết bị mới</Text>
      </View>
      <Text style={[styles.pairingDesc, { color: colors.mutedForeground }]}>
        Tạo mã ghép để kết nối thiết bị qua Telegram, Discord hoặc kênh khác
      </Text>

      {code ? (
        <View style={styles.codeArea}>
          <View style={[styles.codeBox, { backgroundColor: colors.secondary, borderColor: colors.primary + "30" }]}>
            <Text style={[styles.codeText, { color: colors.primary }]} selectable>{code}</Text>
          </View>
          {remaining > 0 && (
            <Text style={[styles.expireText, { color: remaining < 60 ? "#f97316" : colors.mutedForeground }]}>
              Hết hạn sau {remaining}s
            </Text>
          )}
          <TouchableOpacity
            onPress={onCancel}
            style={[styles.cancelBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
            activeOpacity={0.7}
          >
            <Text style={[styles.cancelBtnText, { color: colors.mutedForeground }]}>Hủy mã</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          onPress={onGenerate}
          style={[styles.generateBtn, { backgroundColor: colors.primary + "18", borderColor: colors.primary + "40" }]}
          activeOpacity={0.7}
          disabled={generating}
        >
          {generating ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons name="add-circle-outline" size={16} color={colors.primary} />
          )}
          <Text style={[styles.generateBtnText, { color: colors.primary }]}>
            {generating ? "Đang tạo..." : "Tạo mã ghép"}
          </Text>
        </TouchableOpacity>
      )}
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

  const { devices: liveDevices, pairing, loading, error, refresh, initiratePairing, unpair, cancelPairing } = useDevices();
  const devices = liveDevices;
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    await initiratePairing?.();
    setGenerating(false);
  };

  const handleUnpair = (senderID: string) => {
    Alert.alert(
      "Gỡ kết nối thiết bị",
      "Thiết bị này sẽ không thể gửi tin nhắn đến agent nữa.",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Gỡ kết nối",
          style: "destructive",
          onPress: () => unpair(senderID),
        },
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
          <Text style={[styles.badge, { color: colors.mutedForeground }]}>{devices.length}</Text>
        </View>
        <TouchableOpacity onPress={refresh} style={[styles.iconBtn, { backgroundColor: colors.muted }]} activeOpacity={0.7}>
          {loading ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="refresh-outline" size={15} color={colors.mutedForeground} />}
        </TouchableOpacity>
      </View>

      <FlatList
        data={devices}
        keyExtractor={(d) => d.sender_id}
        renderItem={({ item }) => <DeviceCard item={item} colors={colors} onUnpair={handleUnpair} />}
        ListHeaderComponent={() => (
          <View style={styles.listHeader}>
            <PairingCodeCard
              colors={colors}
              onGenerate={handleGenerate}
              onCancel={cancelPairing ?? (() => {})}
              code={pairing?.code}
              expiresAt={pairing?.expires_at}
              generating={generating}
            />
            {devices.length > 0 && (
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>THIẾT BỊ ĐÃ GHÉP</Text>
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
          <View style={styles.emptyWrap}>
            <Ionicons name="phone-portrait-outline" size={36} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Chưa có thiết bị nào được ghép</Text>
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
  list: { paddingHorizontal: 14, paddingTop: 0 },
  listHeader: { gap: 14, marginBottom: 8 },
  sectionLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8, paddingHorizontal: 2 },
  pairingCard: { borderRadius: 18, borderWidth: 1, padding: 16, gap: 10 },
  pairingHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  pairingTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  pairingDesc: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  codeArea: { gap: 8 },
  codeBox: { borderRadius: 12, borderWidth: 1, padding: 12, alignItems: "center" },
  codeText: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: 8 },
  expireText: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center" },
  cancelBtn: { borderRadius: 10, borderWidth: 1, paddingVertical: 8, alignItems: "center" },
  cancelBtnText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  generateBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 12, borderWidth: 1, paddingVertical: 10 },
  generateBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
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
});
