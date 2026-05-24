import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useChannelQR, QRChannelType } from "@/hooks/useChannelQR";

const CHANNEL_CONFIG: Record<string, { label: string; color: string; icon: keyof typeof Ionicons["glyphMap"] }> = {
  whatsapp: { label: "WhatsApp", color: "#25D366", icon: "logo-whatsapp" },
  zalo: { label: "Zalo", color: "#006AF5", icon: "chatbubble-outline" },
};

const QR_TIMEOUT_SECONDS = 300;

export default function ChannelQRScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id, type, name } = useLocalSearchParams<{ id: string; type: string; name?: string }>();
  const topPad = insets.top;

  const channelType = (type ?? "whatsapp") as QRChannelType;
  const { state, startQR, reset } = useChannelQR(channelType, id);
  const cfg = CHANNEL_CONFIG[channelType] ?? CHANNEL_CONFIG.whatsapp;

  const [countdown, setCountdown] = useState(QR_TIMEOUT_SECONDS);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (state.status === "pending") {
      setCountdown(QR_TIMEOUT_SECONDS);
      timerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state.status]);

  const handleStart = () => {
    reset();
    startQR(false);
  };

  const handleForceReauth = () => {
    reset();
    startQR(true);
  };

  const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const isUrgent = state.status === "pending" && countdown < 60;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 4 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>QR Pairing</Text>
        <View style={[styles.channelBadge, { backgroundColor: cfg.color + "20" }]}>
          <Ionicons name={cfg.icon} size={14} color={cfg.color} />
          <Text style={[styles.channelBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
      </View>

      <View style={styles.content}>
        {/* Instance info */}
        <View style={[styles.instanceCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="hardware-chip-outline" size={16} color={colors.mutedForeground} />
          <Text style={[styles.instanceText, { color: colors.mutedForeground }]}>Instance: {id ?? "—"}</Text>
          {name && <Text style={[styles.instanceName, { color: colors.foreground }]}>{name}</Text>}
        </View>

        {/* Status & QR display */}
        {state.status === "idle" && (
          <View style={styles.center}>
            <View style={[styles.iconCircle, { backgroundColor: cfg.color + "15" }]}>
              <Ionicons name="qr-code-outline" size={52} color={cfg.color} />
            </View>
            <Text style={[styles.statusTitle, { color: colors.foreground }]}>Chưa bắt đầu</Text>
            <Text style={[styles.statusDesc, { color: colors.mutedForeground }]}>
              Nhấn nút bên dưới để tạo mã QR và kết nối {cfg.label}
            </Text>
          </View>
        )}

        {state.status === "starting" && (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={cfg.color} />
            <Text style={[styles.statusTitle, { color: colors.foreground }]}>Đang khởi động...</Text>
            <Text style={[styles.statusDesc, { color: colors.mutedForeground }]}>Đang tạo phiên QR</Text>
          </View>
        )}

        {state.status === "pending" && state.qrBase64 && (
          <View style={styles.center}>
            <View style={[styles.qrWrap, { borderColor: isUrgent ? "#f97316" : cfg.color }]}>
              <Image
                source={{ uri: `data:image/png;base64,${state.qrBase64}` }}
                style={styles.qrImage}
                resizeMode="contain"
              />
            </View>
            <View style={[styles.countdownRow, { backgroundColor: isUrgent ? "#f9731615" : colors.card, borderColor: isUrgent ? "#f9731640" : colors.border }]}>
              <Ionicons name="time-outline" size={14} color={isUrgent ? "#f97316" : colors.mutedForeground} />
              <Text style={[styles.countdownText, { color: isUrgent ? "#f97316" : colors.mutedForeground }]}>
                {isUrgent ? "Sắp hết hạn — " : ""}Còn {fmtTime(countdown)}
              </Text>
            </View>
            <Text style={[styles.statusDesc, { color: colors.mutedForeground }]}>
              Mở {cfg.label} → Cài đặt → Thiết bị đã liên kết → Quét mã QR
            </Text>
          </View>
        )}

        {state.status === "connected" && (
          <View style={styles.center}>
            <View style={[styles.iconCircle, { backgroundColor: "#22c55e20" }]}>
              <Ionicons name="checkmark-circle" size={52} color="#22c55e" />
            </View>
            <Text style={[styles.statusTitle, { color: "#22c55e" }]}>Đã kết nối thành công!</Text>
            <Text style={[styles.statusDesc, { color: colors.mutedForeground }]}>
              {cfg.label} đã được liên kết với instance này
            </Text>
          </View>
        )}

        {state.status === "error" && (
          <View style={styles.center}>
            <View style={[styles.iconCircle, { backgroundColor: "#ef444420" }]}>
              <Ionicons name="close-circle" size={52} color="#ef4444" />
            </View>
            <Text style={[styles.statusTitle, { color: "#ef4444" }]}>Lỗi kết nối</Text>
            <Text style={[styles.statusDesc, { color: colors.mutedForeground }]}>{state.error ?? "Không thể kết nối"}</Text>
          </View>
        )}
      </View>

      {/* Action buttons */}
      <View style={[styles.actions, { paddingBottom: insets.bottom + 20 }]}>
        {(state.status === "idle" || state.status === "error") && (
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: cfg.color }]}
            onPress={handleStart}
            activeOpacity={0.8}
          >
            <Ionicons name="qr-code-outline" size={18} color="#fff" />
            <Text style={styles.primaryBtnText}>Tạo mã QR</Text>
          </TouchableOpacity>
        )}

        {state.status === "pending" && (
          <>
            <TouchableOpacity
              style={[styles.secondaryBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
              onPress={handleStart}
              activeOpacity={0.7}
            >
              <Ionicons name="refresh-outline" size={16} color={colors.mutedForeground} />
              <Text style={[styles.secondaryBtnText, { color: colors.mutedForeground }]}>Làm mới QR</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.secondaryBtn, { backgroundColor: "#f9731615", borderColor: "#f9731640" }]}
              onPress={handleForceReauth}
              activeOpacity={0.7}
            >
              <Ionicons name="shield-outline" size={16} color="#f97316" />
              <Text style={[styles.secondaryBtnText, { color: "#f97316" }]}>Buộc xác thực lại</Text>
            </TouchableOpacity>
          </>
        )}

        {state.status === "connected" && (
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.muted }]}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back-outline" size={18} color={colors.foreground} />
            <Text style={[styles.primaryBtnText, { color: colors.foreground }]}>Quay lại</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingBottom: 10, gap: 8 },
  backBtn: { padding: 4 },
  title: { flex: 1, fontSize: 20, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  channelBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  channelBadgeText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  content: { flex: 1, paddingHorizontal: 20 },
  instanceCard: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 14, borderWidth: 1, padding: 12, marginBottom: 24 },
  instanceText: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1 },
  instanceName: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  center: { alignItems: "center", justifyContent: "center", flex: 1, gap: 16 },
  iconCircle: { width: 100, height: 100, borderRadius: 50, alignItems: "center", justifyContent: "center" },
  statusTitle: { fontSize: 20, fontFamily: "Inter_700Bold", textAlign: "center" },
  statusDesc: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 18, maxWidth: 280 },
  qrWrap: { width: 240, height: 240, borderRadius: 20, borderWidth: 3, overflow: "hidden", padding: 4 },
  qrImage: { width: "100%", height: "100%" },
  countdownRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderWidth: 1 },
  countdownText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  actions: { paddingHorizontal: 20, gap: 10, paddingTop: 10 },
  primaryBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 16, paddingVertical: 15 },
  primaryBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
  secondaryBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 14, borderWidth: 1, paddingVertical: 12 },
  secondaryBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
