import React, { useState } from "react";
import {
  Alert,
  Clipboard,
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

function maskToken(token: string): string {
  if (!token || token.length < 8) return "••••••••";
  return "••••••••" + token.slice(-4);
}

function maskUrl(url: string): string {
  if (!url) return "—";
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.hostname}${u.port ? `:${u.port}` : ""}`;
  } catch {
    return url;
  }
}

interface InfoRowProps {
  label: string;
  value: string;
  mono?: boolean;
  copyable?: boolean;
  colors: ReturnType<typeof useColors>;
}

function InfoRow({ label, value, mono, copyable, colors }: InfoRowProps) {
  const handleCopy = () => {
    Clipboard.setString(value);
    Alert.alert("Đã sao chép", `${label} đã được sao chép`);
  };

  return (
    <View style={[profileStyles.infoRow, { borderBottomColor: colors.border }]}>
      <Text style={[profileStyles.infoLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <View style={profileStyles.infoValueRow}>
        <Text
          style={[profileStyles.infoValue, { color: colors.foreground, fontFamily: mono ? "monospace" : "Inter_400Regular" }]}
          numberOfLines={1}
        >
          {value}
        </Text>
        {copyable && (
          <TouchableOpacity onPress={handleCopy} activeOpacity={0.7} style={profileStyles.copyBtn}>
            <Ionicons name="copy-outline" size={13} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { serverUrl, token, userId, connected, connectionState, role, tenantName, isOwner, logout } = useAuth();
  const topPad = insets.top;
  const [showToken, setShowToken] = useState(false);

  const initials = userId ? userId.slice(0, 2).toUpperCase() : "??";
  const roleColor = isOwner ? "#f97316" : role === "admin" ? "#60a5fa" : "#22c55e";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Hồ sơ</Text>
        <TouchableOpacity
          onPress={() => router.push("/login")}
          style={[styles.editBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
          activeOpacity={0.7}
        >
          <Ionicons name="pencil-outline" size={14} color={colors.mutedForeground} />
          <Text style={[styles.editBtnText, { color: colors.mutedForeground }]}>Đổi kết nối</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar card */}
        <View style={[styles.avatarCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.avatar, { backgroundColor: colors.primary + "22" }]}>
            <Text style={[styles.avatarText, { color: colors.primary }]}>{initials}</Text>
          </View>
          <View style={styles.avatarInfo}>
            <Text style={[styles.displayName, { color: colors.foreground }]}>
              {userId || "Chưa đăng nhập"}
            </Text>
            <View style={styles.roleRow}>
              <View style={[styles.roleBadge, { backgroundColor: roleColor + "20" }]}>
                <Text style={[styles.roleText, { color: roleColor }]}>
                  {isOwner ? "Owner" : role || "user"}
                </Text>
              </View>
              {tenantName && (
                <View style={[styles.tenantBadge, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                  <Ionicons name="business-outline" size={10} color={colors.mutedForeground} />
                  <Text style={[styles.tenantText, { color: colors.mutedForeground }]}>{tenantName}</Text>
                </View>
              )}
            </View>
          </View>
          <View style={[styles.connDot, { backgroundColor: connected ? "#22c55e" : "#71717a" }]} />
        </View>

        {/* Connection status */}
        <View style={[styles.statusCard, {
          backgroundColor: connected ? "#22c55e12" : colors.card,
          borderColor: connected ? "#22c55e30" : colors.border,
        }]}>
          <View style={styles.statusRow}>
            <View style={[styles.statusIndicator, { backgroundColor: connected ? "#22c55e" : "#71717a" }]} />
            <Text style={[styles.statusLabel, { color: colors.foreground }]}>
              {connected ? "Đã kết nối" : connectionState === "connecting" ? "Đang kết nối..." : "Offline"}
            </Text>
            <Text style={[styles.statusState, { color: colors.mutedForeground }]}>{connectionState}</Text>
          </View>
        </View>

        {/* Account info */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Thông tin tài khoản</Text>
          <InfoRow label="User ID" value={userId || "—"} mono copyable colors={colors} />
          <InfoRow label="Tenant" value={tenantName || "—"} colors={colors} />
          <InfoRow label="Vai trò" value={isOwner ? "Owner" : role || "user"} colors={colors} />
          <InfoRow label="Server URL" value={maskUrl(serverUrl)} copyable colors={colors} />
          <View style={[profileStyles.infoRow, { borderBottomColor: "transparent" }]}>
            <Text style={[profileStyles.infoLabel, { color: colors.mutedForeground }]}>API Token</Text>
            <View style={profileStyles.infoValueRow}>
              <Text style={[profileStyles.infoValue, { color: colors.foreground, fontFamily: "monospace" }]} numberOfLines={1}>
                {showToken ? token : maskToken(token)}
              </Text>
              <TouchableOpacity onPress={() => setShowToken((v) => !v)} activeOpacity={0.7} style={profileStyles.copyBtn}>
                <Ionicons name={showToken ? "eye-off-outline" : "eye-outline"} size={13} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsSection}>
          <TouchableOpacity
            style={[styles.actionItem, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push("/api-keys")}
            activeOpacity={0.75}
          >
            <View style={[styles.actionIcon, { backgroundColor: "#22c55e18" }]}>
              <Ionicons name="key-outline" size={18} color="#22c55e" />
            </View>
            <Text style={[styles.actionLabel, { color: colors.foreground }]}>Quản lý API Keys</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionItem, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push("/activity")}
            activeOpacity={0.75}
          >
            <View style={[styles.actionIcon, { backgroundColor: "#a78bfa18" }]}>
              <Ionicons name="time-outline" size={18} color="#a78bfa" />
            </View>
            <Text style={[styles.actionLabel, { color: colors.foreground }]}>Lịch sử hoạt động</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionItem, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push("/devices")}
            activeOpacity={0.75}
          >
            <View style={[styles.actionIcon, { backgroundColor: "#60a5fa18" }]}>
              <Ionicons name="phone-portrait-outline" size={18} color="#60a5fa" />
            </View>
            <Text style={[styles.actionLabel, { color: colors.foreground }]}>Thiết bị đã đăng nhập</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        {/* Logout */}
        <TouchableOpacity
          style={[styles.logoutBtn, { backgroundColor: colors.destructive + "15", borderColor: colors.destructive + "30" }]}
          onPress={() => {
            Alert.alert("Đăng xuất", "Đăng xuất khỏi tài khoản này?", [
              { text: "Hủy", style: "cancel" },
              { text: "Đăng xuất", style: "destructive", onPress: async () => { await logout(); router.replace("/login"); } },
            ]);
          }}
          activeOpacity={0.75}
        >
          <Ionicons name="log-out-outline" size={18} color={colors.destructive} />
          <Text style={[styles.logoutText, { color: colors.destructive }]}>Đăng xuất</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const profileStyles = StyleSheet.create({
  infoRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 11, borderBottomWidth: 1 },
  infoLabel: { fontSize: 13, fontFamily: "Inter_400Regular", flexShrink: 0 },
  infoValueRow: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1, justifyContent: "flex-end" },
  infoValue: { fontSize: 13, textAlign: "right", flex: 1 },
  copyBtn: { padding: 4 },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, gap: 10 },
  backBtn: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 18, fontFamily: "Inter_700Bold" },
  editBtn: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 7 },
  editBtnText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 12 },
  avatarCard: { flexDirection: "row", alignItems: "center", gap: 14, borderRadius: 18, borderWidth: 1, padding: 16 },
  avatar: { width: 54, height: 54, borderRadius: 18, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  avatarText: { fontSize: 20, fontFamily: "Inter_700Bold" },
  avatarInfo: { flex: 1, gap: 6 },
  displayName: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  roleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  roleText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  tenantBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  tenantText: { fontSize: 10, fontFamily: "Inter_400Regular" },
  connDot: { width: 10, height: 10, borderRadius: 5 },
  statusCard: { flexDirection: "row", alignItems: "center", borderRadius: 12, borderWidth: 1, padding: 12 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  statusIndicator: { width: 8, height: 8, borderRadius: 4 },
  statusLabel: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium" },
  statusState: { fontSize: 12, fontFamily: "Inter_400Regular" },
  section: { borderRadius: 16, borderWidth: 1, padding: 16 },
  sectionTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 8 },
  actionsSection: { gap: 8 },
  actionItem: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, borderWidth: 1, padding: 14 },
  actionIcon: { width: 36, height: 36, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  actionLabel: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  logoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14, borderWidth: 1, paddingVertical: 14, marginTop: 4 },
  logoutText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
