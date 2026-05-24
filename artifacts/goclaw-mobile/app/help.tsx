import React, { useState } from "react";
import {
  Linking,
  Platform,
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

interface FaqItem {
  q: string;
  a: string;
}

const FAQ: FaqItem[] = [
  { q: "Làm sao lấy API Token?", a: "Mở web dashboard → Settings → API Keys → tạo key mới. Copy key và dán vào màn hình đăng nhập của app." },
  { q: "App không kết nối được server?", a: "Kiểm tra Server URL (phải có http:// hoặc https://), token còn hiệu lực, và server đang chạy. Thử ping URL bằng trình duyệt." },
  { q: "Dữ liệu demo là gì?", a: "Khi chưa kết nối server, app hiển thị dữ liệu mẫu để demo tính năng. Bấm 'Đăng nhập' để kết nối server thật." },
  { q: "Protocol version là gì?", a: "App dùng WebSocket Protocol v3. Backend GoClaw phải chạy phiên bản tương thích (v1.3+). Kiểm tra trong màn hình Health Monitor." },
  { q: "Làm sao approve tool execution?", a: "Vào More → Approvals để xem và xử lý các yêu cầu đang chờ. Có thể approve/deny từng cái hoặc bulk select." },
  { q: "Traces là gì?", a: "Traces ghi lại toàn bộ quá trình agent xử lý: LLM calls, tool calls, memory access. Dùng để debug và tối ưu hiệu năng." },
];

interface LinkItem {
  label: string;
  icon: keyof typeof Ionicons["glyphMap"];
  color: string;
  url?: string;
  route?: string;
}

const LINKS: LinkItem[] = [
  { label: "Tài liệu API", icon: "document-text-outline", color: "#60a5fa", url: "https://docs.goclaw.io" },
  { label: "WebSocket Protocol", icon: "git-branch-outline", color: "#a78bfa", url: "https://docs.goclaw.io/protocol" },
  { label: "GitHub", icon: "logo-github", color: "#a1a1aa", url: "https://github.com/bilonglo9x-code/agentclaw" },
  { label: "Báo lỗi / Feedback", icon: "bug-outline", color: "#f97316", url: "https://github.com/bilonglo9x-code/agentclaw/issues" },
];

export default function HelpScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { connected, serverUrl } = useAuth();
  const topPad = insets.top;
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Trợ giúp</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Status banner */}
        <View style={[styles.statusCard, { backgroundColor: connected ? "#22c55e18" : colors.card, borderColor: connected ? "#22c55e40" : colors.border }]}>
          <View style={[styles.statusDot, { backgroundColor: connected ? "#22c55e" : "#71717a" }]} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.statusText, { color: colors.foreground }]}>
              {connected ? "Đã kết nối server" : "Chưa kết nối"}
            </Text>
            {serverUrl ? (
              <Text style={[styles.statusUrl, { color: colors.mutedForeground }]} numberOfLines={1}>
                {serverUrl}
              </Text>
            ) : null}
          </View>
          <TouchableOpacity onPress={() => router.push("/login")} activeOpacity={0.7}>
            <Text style={[styles.changeBtn, { color: colors.primary }]}>
              {connected ? "Đổi" : "Đăng nhập"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Quick shortcuts */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>LỐI TẮT NHANH</Text>
        <View style={styles.shortcutGrid}>
          {[
            { label: "Health", icon: "heart-outline" as const, color: "#22c55e", route: "/health" },
            { label: "Monitor", icon: "radio-outline" as const, color: "#60a5fa", route: "/(tabs)/monitor" },
            { label: "Config", icon: "settings-outline" as const, color: "#f97316", route: "/config" },
            { label: "Traces", icon: "analytics-outline" as const, color: "#a78bfa", route: "/traces" },
          ].map((s) => (
            <TouchableOpacity
              key={s.label}
              style={[styles.shortcut, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push(s.route as Parameters<typeof router.push>[0])}
              activeOpacity={0.7}
            >
              <View style={[styles.shortcutIcon, { backgroundColor: s.color + "18" }]}>
                <Ionicons name={s.icon} size={18} color={s.color} />
              </View>
              <Text style={[styles.shortcutLabel, { color: colors.foreground }]}>{s.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* FAQ */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>CÂU HỎI THƯỜNG GẶP</Text>
        {FAQ.map((item, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.faqCard, { backgroundColor: colors.card, borderColor: openFaq === i ? colors.primary + "40" : colors.border }]}
            onPress={() => setOpenFaq(openFaq === i ? null : i)}
            activeOpacity={0.75}
          >
            <View style={styles.faqHeader}>
              <Text style={[styles.faqQ, { color: colors.foreground }]}>{item.q}</Text>
              <Ionicons
                name={openFaq === i ? "chevron-up" : "chevron-down"}
                size={16}
                color={colors.mutedForeground}
              />
            </View>
            {openFaq === i && (
              <Text style={[styles.faqA, { color: colors.mutedForeground }]}>{item.a}</Text>
            )}
          </TouchableOpacity>
        ))}

        {/* Links */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground, marginTop: 8 }]}>TÀI NGUYÊN</Text>
        <View style={[styles.linksCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {LINKS.map((link, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.linkRow, i < LINKS.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
              onPress={() => link.url && Linking.openURL(link.url)}
              activeOpacity={0.7}
            >
              <View style={[styles.linkIcon, { backgroundColor: link.color + "18" }]}>
                <Ionicons name={link.icon} size={16} color={link.color} />
              </View>
              <Text style={[styles.linkLabel, { color: colors.foreground }]}>{link.label}</Text>
              <Ionicons name="open-outline" size={14} color={colors.mutedForeground} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Version */}
        <Text style={[styles.versionText, { color: colors.mutedForeground }]}>
          GoClaw Mobile · Protocol v3
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, gap: 10 },
  backBtn: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 18, fontFamily: "Inter_700Bold" },
  content: { paddingHorizontal: 16, paddingTop: 8 },
  statusCard: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 20 },
  statusDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  statusText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  statusUrl: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  changeBtn: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  sectionLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8, marginBottom: 10 },
  shortcutGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 },
  shortcut: { width: "47%", flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, borderWidth: 1, padding: 12 },
  shortcutIcon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  shortcutLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  faqCard: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 8 },
  faqHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  faqQ: { fontSize: 14, fontFamily: "Inter_600SemiBold", flex: 1 },
  faqA: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 10, lineHeight: 19 },
  linksCard: { borderRadius: 14, borderWidth: 1, overflow: "hidden", marginBottom: 20 },
  linkRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 13 },
  linkIcon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  linkLabel: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  versionText: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center", paddingBottom: 10 },
});
