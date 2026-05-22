import React from "react";
import {
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
import { useApprovals } from "@/hooks/useApprovals";

interface MenuItem {
  icon: keyof typeof Ionicons["glyphMap"];
  label: string;
  badge?: string;
  badgeCount?: number;
  color?: string;
  danger?: boolean;
  onPress?: () => void;
}

interface MenuSection {
  title: string;
  tag?: string;
  items: MenuItem[];
}

export default function MoreScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { connected, tenantName, role, logout } = useAuth();
  const { pendingCount } = useApprovals();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const SECTIONS: MenuSection[] = [
    {
      title: "Tính năng",
      items: [
        { icon: "flash-outline", label: "Skills", color: "#f59e0b", onPress: () => router.push("/skills") },
        { icon: "shield-outline", label: "Approvals", color: "#f97316", badgeCount: pendingCount, onPress: () => router.push("/approvals") },
        { icon: "hardware-chip-outline", label: "Channels", color: "#60a5fa", onPress: () => router.push("/channels") },
        { icon: "time-outline", label: "Cron Jobs", color: "#22c55e", onPress: () => router.push("/cron") },
        { icon: "server-outline", label: "MCP Servers", color: "#a78bfa", onPress: () => router.push("/mcp") },
      ],
    },
    {
      title: "Observability",
      items: [
        { icon: "search-outline", label: "Traces", color: "#60a5fa", onPress: () => router.push("/traces") },
        { icon: "radio-outline", label: "Events", color: "#a78bfa", onPress: () => router.push("/events") },
      ],
    },
    {
      title: "Dữ liệu",
      items: [
        { icon: "bulb-outline", label: "Memory & Knowledge", color: "#f97316" },
        { icon: "archive-outline", label: "Vault", badge: "48 docs", color: "#60a5fa" },
        { icon: "save-outline", label: "Storage", badge: "2.3 GB", color: "#22c55e" },
        { icon: "folder-open-outline", label: "Sessions History", color: "#a1a1aa" },
      ],
    },
    ...(role === "owner" || role === "admin"
      ? [
          {
            title: "Admin",
            tag: "Owner only",
            items: [
              { icon: "color-palette-outline" as keyof typeof Ionicons["glyphMap"], label: "Branding & Theme", color: "#f97316" },
              { icon: "business-outline" as keyof typeof Ionicons["glyphMap"], label: "Tenants", color: "#60a5fa" },
              { icon: "settings-outline" as keyof typeof Ionicons["glyphMap"], label: "Providers", color: "#a78bfa", onPress: () => router.push("/providers") },
              { icon: "key-outline" as keyof typeof Ionicons["glyphMap"], label: "API Keys", color: "#f59e0b" },
              { icon: "swap-horizontal-outline" as keyof typeof Ionicons["glyphMap"], label: "Import / Export", color: "#22c55e" },
            ],
          },
        ]
      : []),
    {
      title: "Tài khoản",
      items: [
        { icon: "moon-outline", label: "Giao diện & Theme", badge: "Dark", color: "#a78bfa" },
        { icon: "language-outline", label: "Ngôn ngữ", badge: "Tiếng Việt", color: "#60a5fa" },
        { icon: "help-circle-outline", label: "Trợ giúp", color: "#a1a1aa" },
        {
          icon: "log-out-outline",
          label: "Đăng xuất",
          danger: true,
          onPress: async () => {
            await logout();
            router.replace("/login");
          },
        },
      ],
    },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: topPad + 8, paddingBottom: insets.bottom + 110 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile header */}
      <View style={[styles.profile, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.avatar, { backgroundColor: colors.primary + "25" }]}>
          <Ionicons name="person" size={28} color={colors.primary} />
          <View
            style={[
              styles.connDot,
              { backgroundColor: connected ? colors.success : colors.mutedForeground, borderColor: colors.card },
            ]}
          />
        </View>
        <View style={styles.profileInfo}>
          <Text style={[styles.profileName, { color: colors.foreground }]}>
            {connected ? "Đã kết nối" : "Chưa kết nối"}
          </Text>
          <Text style={[styles.profileEmail, { color: colors.mutedForeground }]}>
            {tenantName || "Nhấn để đăng nhập"}
          </Text>
          <View style={styles.profileBadgeRow}>
            {role && (
              <View style={[styles.roleBadge, { backgroundColor: colors.primary + "20", borderColor: colors.primary + "40" }]}>
                <Text style={[styles.roleText, { color: colors.primary }]}>{role}</Text>
              </View>
            )}
            {!connected && (
              <TouchableOpacity onPress={() => router.push("/login")} activeOpacity={0.7}>
                <Text style={[styles.loginLink, { color: colors.primary }]}>Đăng nhập →</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        <TouchableOpacity
          style={[styles.editBtn, { backgroundColor: colors.muted }]}
          activeOpacity={0.7}
          onPress={() => router.push("/login")}
        >
          <Ionicons name={connected ? "cloud-done-outline" : "cloud-offline-outline"} size={16} color={connected ? colors.success : colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      {SECTIONS.map((section) => (
        <View key={section.title} style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
              {section.title.toUpperCase()}
            </Text>
            {section.tag && (
              <View style={[styles.sectionTag, { backgroundColor: colors.primary + "20", borderColor: colors.primary + "30" }]}>
                <Text style={[styles.sectionTagText, { color: colors.primary }]}>{section.tag}</Text>
              </View>
            )}
          </View>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {section.items.map((item, i) => (
              <TouchableOpacity
                key={item.label}
                style={[
                  styles.menuRow,
                  { borderBottomColor: colors.border },
                  i === section.items.length - 1 && styles.noBorder,
                ]}
                activeOpacity={0.7}
                onPress={item.onPress}
              >
                <View style={[styles.menuIcon, { backgroundColor: (item.color ?? colors.primary) + "18" }]}>
                  <Ionicons
                    name={item.icon}
                    size={18}
                    color={item.danger ? colors.destructive : (item.color ?? colors.primary)}
                  />
                </View>
                <Text style={[styles.menuLabel, { color: item.danger ? colors.destructive : colors.foreground }]}>
                  {item.label}
                </Text>
                <View style={styles.menuRight}>
                  {item.badge && (
                    <Text style={[styles.menuBadge, { color: colors.mutedForeground }]} numberOfLines={1}>
                      {item.badge}
                    </Text>
                  )}
                  {!!item.badgeCount && item.badgeCount > 0 && (
                    <View style={[styles.countDot, { backgroundColor: colors.primary }]}>
                      <Text style={styles.countDotText}>{item.badgeCount}</Text>
                    </View>
                  )}
                  {!item.danger && <Ionicons name="chevron-forward" size={15} color={colors.mutedForeground} />}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16 },
  profile: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 24,
    gap: 12,
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  connDot: { position: "absolute", bottom: -1, right: -1, width: 14, height: 14, borderRadius: 7, borderWidth: 2 },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 16, fontFamily: "Inter_700Bold" },
  profileEmail: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  profileBadgeRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  roleText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  loginLink: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  editBtn: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  section: { marginBottom: 20 },
  sectionHeaderRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8, paddingHorizontal: 2 },
  sectionTitle: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8 },
  sectionTag: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
  sectionTagText: { fontSize: 9, fontFamily: "Inter_600SemiBold" },
  card: { borderRadius: 18, borderWidth: 1, overflow: "hidden" },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  noBorder: { borderBottomWidth: 0 },
  menuIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  menuLabel: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  menuRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  menuBadge: { fontSize: 12, fontFamily: "Inter_400Regular", maxWidth: 110 },
  countDot: { minWidth: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center", paddingHorizontal: 5 },
  countDotText: { color: "#fff", fontSize: 10, fontFamily: "Inter_700Bold" },
});
