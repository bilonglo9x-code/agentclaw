import React, { useEffect, useState } from "react";
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
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { useApprovals } from "@/hooks/useApprovals";

const FAVORITES_KEY = "goclaw:favorites";

const ALL_SHORTCUTS = [
  { key: "search", icon: "search-outline" as keyof typeof Ionicons["glyphMap"], label: "Tìm kiếm", color: "#60a5fa", route: "/search" },
  { key: "traces", icon: "analytics-outline" as keyof typeof Ionicons["glyphMap"], label: "Traces", color: "#a78bfa", route: "/traces" },
  { key: "approvals", icon: "shield-outline" as keyof typeof Ionicons["glyphMap"], label: "Approvals", color: "#f97316", route: "/approvals" },
  { key: "skills", icon: "flash-outline" as keyof typeof Ionicons["glyphMap"], label: "Skills", color: "#f59e0b", route: "/skills" },
  { key: "memory", icon: "library-outline" as keyof typeof Ionicons["glyphMap"], label: "Memory", color: "#22c55e", route: "/memory" },
  { key: "kg", icon: "git-network-outline" as keyof typeof Ionicons["glyphMap"], label: "KG", color: "#a78bfa", route: "/knowledge-graph" },
  { key: "models", icon: "cube-outline" as keyof typeof Ionicons["glyphMap"], label: "Models", color: "#60a5fa", route: "/models" },
  { key: "events", icon: "radio-outline" as keyof typeof Ionicons["glyphMap"], label: "Events", color: "#a78bfa", route: "/events" },
  { key: "devices", icon: "phone-portrait-outline" as keyof typeof Ionicons["glyphMap"], label: "Devices", color: "#22c55e", route: "/devices" },
  { key: "evolution", icon: "bulb-outline" as keyof typeof Ionicons["glyphMap"], label: "Evolution", color: "#f59e0b", route: "/evolution" },
  { key: "vault", icon: "archive-outline" as keyof typeof Ionicons["glyphMap"], label: "Vault", color: "#60a5fa", route: "/vault" },
  { key: "teams", icon: "people-circle-outline" as keyof typeof Ionicons["glyphMap"], label: "Teams", color: "#22c55e", route: "/teams" },
  { key: "config", icon: "settings-outline" as keyof typeof Ionicons["glyphMap"], label: "Config", color: "#f97316", route: "/config" },
  { key: "media", icon: "images-outline" as keyof typeof Ionicons["glyphMap"], label: "Media", color: "#ec4899", route: "/media" },
  { key: "vault-graph", icon: "git-network-outline" as keyof typeof Ionicons["glyphMap"], label: "Vault Graph", color: "#34d399", route: "/vault-graph" },
  { key: "tts-config", icon: "mic-outline" as keyof typeof Ionicons["glyphMap"], label: "TTS Config", color: "#a78bfa", route: "/tts-config" },
];
const DEFAULT_PINNED = ["search", "traces", "approvals", "skills", "memory", "kg"];

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
  const [pinnedKeys, setPinnedKeys] = useState<string[]>(DEFAULT_PINNED);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(FAVORITES_KEY).then((val) => {
      if (val) {
        try { setPinnedKeys(JSON.parse(val)); } catch {}
      }
    });
  }, []);

  const togglePin = (key: string) => {
    setPinnedKeys((prev) => {
      let next: string[];
      if (prev.includes(key)) {
        next = prev.filter((k) => k !== key);
      } else if (prev.length < 6) {
        next = [...prev, key];
      } else {
        return prev;
      }
      AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
      return next;
    });
  };

  const quickItems = ALL_SHORTCUTS.filter((s) => pinnedKeys.includes(s.key));

  const SECTIONS: MenuSection[] = [
    {
      title: "Tính năng",
      items: [
        { icon: "flash-outline", label: "Skills", color: "#f59e0b", onPress: () => router.push("/skills") },
        { icon: "shield-outline", label: "Approvals", color: "#f97316", badgeCount: pendingCount, onPress: () => router.push("/approvals") },
        { icon: "hardware-chip-outline", label: "Channels", color: "#60a5fa", onPress: () => router.push("/channels") },
        { icon: "time-outline", label: "Cron Jobs", color: "#22c55e", onPress: () => router.push("/cron") },
        { icon: "server-outline", label: "MCP Servers", color: "#a78bfa", onPress: () => router.push("/mcp") },
        { icon: "volume-high-outline", label: "Voices & TTS", color: "#f97316", onPress: () => router.push("/voice") },
        { icon: "cube-outline", label: "Models", color: "#60a5fa", onPress: () => router.push("/models") },
      ],
    },
    {
      title: "Observability",
      items: [
        { icon: "search-outline", label: "Traces", color: "#60a5fa", onPress: () => router.push("/traces") },
        { icon: "radio-outline", label: "Events", color: "#a78bfa", onPress: () => router.push("/events") },
        { icon: "bulb-outline", label: "Agent Evolution", color: "#f59e0b", onPress: () => router.push("/evolution") },
      ],
    },
    {
      title: "Dữ liệu",
      items: [
        { icon: "library-outline", label: "Memory & Knowledge", color: "#f97316", onPress: () => router.push("/memory") },
        { icon: "git-network-outline", label: "Knowledge Graph", color: "#a78bfa", onPress: () => router.push("/knowledge-graph") },
        { icon: "archive-outline", label: "Vault", color: "#60a5fa", onPress: () => router.push("/vault") },
        { icon: "chatbubbles-outline", label: "Sessions History", color: "#a78bfa", onPress: () => router.push("/sessions") },
        { icon: "people-circle-outline", label: "Teams", color: "#22c55e", onPress: () => router.push("/teams") },
        { icon: "person-outline", label: "Contacts", color: "#60a5fa", onPress: () => router.push("/contacts") },
        { icon: "folder-open-outline", label: "Storage", color: "#f59e0b", onPress: () => router.push("/storage") },
        { icon: "pulse-outline", label: "Activity Log", color: "#a1a1aa", onPress: () => router.push("/activity") },
      ],
    },
    {
      title: "Media & TTS",
      items: [
        { icon: "images-outline", label: "Media Library", color: "#ec4899", onPress: () => router.push("/media") },
        { icon: "volume-high-outline", label: "Voices & TTS", color: "#f97316", onPress: () => router.push("/voice") },
        { icon: "mic-outline", label: "TTS Config", color: "#a78bfa", onPress: () => router.push("/tts-config") },
        { icon: "git-network-outline", label: "Vault Graph", color: "#34d399", onPress: () => router.push("/vault-graph") },
      ],
    },
    {
      title: "Sistema",
      items: [
        { icon: "heart-outline", label: "Health Monitor", color: "#22c55e", onPress: () => router.push("/health") },
        { icon: "cube-outline", label: "Packages", color: "#3b82f6", onPress: () => router.push("/packages") },
        { icon: "cloud-upload-outline", label: "Backup & Restore", color: "#f97316", onPress: () => router.push("/backup") },
        { icon: "phone-portrait-outline", label: "Devices", color: "#a78bfa", onPress: () => router.push("/devices") },
      ],
    },
    ...(role === "owner" || role === "admin"
      ? [
          {
            title: "Admin",
            tag: "Owner only",
            items: [
              { icon: "code-slash-outline" as keyof typeof Ionicons["glyphMap"], label: "System Config", color: "#f97316", onPress: () => router.push("/config") },
              { icon: "color-palette-outline" as keyof typeof Ionicons["glyphMap"], label: "Branding & Theme", color: "#60a5fa", onPress: () => router.push("/branding") },
              { icon: "business-outline" as keyof typeof Ionicons["glyphMap"], label: "Tenants", color: "#a78bfa", onPress: () => router.push("/tenants") },
              { icon: "settings-outline" as keyof typeof Ionicons["glyphMap"], label: "Providers", color: "#f59e0b", onPress: () => router.push("/providers") },
              { icon: "key-outline" as keyof typeof Ionicons["glyphMap"], label: "API Keys", color: "#22c55e", onPress: () => router.push("/api-keys") },
              { icon: "swap-horizontal-outline" as keyof typeof Ionicons["glyphMap"], label: "Import / Export", color: "#60a5fa", onPress: () => router.push("/import-export") },
              { icon: "lock-closed-outline" as keyof typeof Ionicons["glyphMap"], label: "Config Permissions", color: "#a78bfa", onPress: () => router.push("/permissions") },
            ],
          },
        ]
      : []),
    {
      title: "Tài khoản",
      items: [
        { icon: "moon-outline", label: "Giao diện & Theme", badge: "Dark", color: "#a78bfa" },
        { icon: "language-outline", label: "Ngôn ngữ", badge: "Tiếng Việt", color: "#60a5fa" },
        { icon: "help-circle-outline", label: "Trợ giúp", color: "#a1a1aa", onPress: () => router.push("/help") },
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

  const QUICK_ACCESS = quickItems.map((s) => ({
    ...s,
    badge: s.key === "approvals" ? pendingCount : undefined,
    onPress: () => router.push(s.route as Parameters<typeof router.push>[0]),
  }));

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: topPad + 8, paddingBottom: insets.bottom + 110 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Quick Access Grid */}
      <View style={styles.quickAccessSection}>
        <View style={styles.quickAccessHeader}>
          <Text style={[styles.quickAccessTitle, { color: colors.mutedForeground }]}>TRUY CẬP NHANH</Text>
          <TouchableOpacity
            onPress={() => setEditMode((v) => !v)}
            style={[styles.editModeBtn, { backgroundColor: editMode ? colors.primary + "22" : colors.muted, borderColor: editMode ? colors.primary + "40" : colors.border }]}
            activeOpacity={0.7}
          >
            <Text style={[styles.editModeBtnText, { color: editMode ? colors.primary : colors.mutedForeground }]}>
              {editMode ? "Xong" : "Sửa"}
            </Text>
          </TouchableOpacity>
        </View>

        {editMode && (
          <View style={[styles.editPanel, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.editHint, { color: colors.mutedForeground }]}>Chọn tối đa 6 shortcut ({pinnedKeys.length}/6)</Text>
            <View style={styles.editGrid}>
              {ALL_SHORTCUTS.map((s) => {
                const pinned = pinnedKeys.includes(s.key);
                return (
                  <TouchableOpacity
                    key={s.key}
                    onPress={() => togglePin(s.key)}
                    style={[styles.editItem, { backgroundColor: pinned ? s.color + "18" : colors.secondary, borderColor: pinned ? s.color + "40" : colors.border }]}
                    activeOpacity={0.7}
                  >
                    <Ionicons name={s.icon} size={16} color={pinned ? s.color : colors.mutedForeground} />
                    <Text style={[styles.editItemLabel, { color: pinned ? s.color : colors.mutedForeground }]} numberOfLines={1}>{s.label}</Text>
                    {pinned && <Ionicons name="checkmark-circle" size={12} color={s.color} style={styles.editCheck} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        <View style={styles.quickAccessGrid}>
          {QUICK_ACCESS.map((item) => (
            <TouchableOpacity
              key={item.label}
              style={[styles.quickAccessItem, { backgroundColor: colors.card, borderColor: colors.border }]}
              activeOpacity={0.7}
              onPress={item.onPress}
            >
              <View style={[styles.quickAccessIcon, { backgroundColor: item.color + "18" }]}>
                <Ionicons name={item.icon} size={18} color={item.color} />
              </View>
              <Text style={[styles.quickAccessLabel, { color: colors.foreground }]}>{item.label}</Text>
              {!!item.badge && item.badge > 0 && (
                <View style={[styles.quickAccessBadge, { backgroundColor: item.color }]}>
                  <Text style={styles.quickAccessBadgeText}>{item.badge}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

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
  quickAccessSection: { marginBottom: 20 },
  quickAccessHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  quickAccessTitle: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8 },
  editModeBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  editModeBtnText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  editPanel: { borderRadius: 16, borderWidth: 1, padding: 12, marginBottom: 12, gap: 10 },
  editHint: { fontSize: 11, fontFamily: "Inter_400Regular" },
  editGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  editItem: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, borderWidth: 1, position: "relative" },
  editItemLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
  editCheck: { marginLeft: 2 },
  quickAccessGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  quickAccessItem: { width: "30.5%", borderRadius: 16, borderWidth: 1, padding: 12, alignItems: "center", gap: 6, position: "relative" },
  quickAccessIcon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  quickAccessLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  quickAccessBadge: { position: "absolute", top: 6, right: 6, minWidth: 16, height: 16, borderRadius: 8, alignItems: "center", justifyContent: "center", paddingHorizontal: 3 },
  quickAccessBadgeText: { color: "#fff", fontSize: 9, fontFamily: "Inter_700Bold" },
});
