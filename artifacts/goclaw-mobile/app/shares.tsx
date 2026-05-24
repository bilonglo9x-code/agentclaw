import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useShares, AgentShare } from "@/hooks/useShares";
import { useAuth } from "@/context/AuthContext";

const ROLE_CONFIG: Record<string, { color: string; label: string; icon: keyof typeof Ionicons["glyphMap"] }> = {
  admin: { color: "#f97316", label: "Admin", icon: "shield-outline" },
  user: { color: "#60a5fa", label: "User", icon: "person-outline" },
};

export default function SharesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { agentId, agentName } = useLocalSearchParams<{ agentId: string; agentName?: string }>();
  const { connected } = useAuth();
  const { shares, loading, error, load, grantShare, revokeShare } = useShares(agentId);
  const topPad = insets.top;

  const [showModal, setShowModal] = useState(false);
  const [newUserId, setNewUserId] = useState("");
  const [newRole, setNewRole] = useState<"user" | "admin">("user");
  const [granting, setGranting] = useState(false);

  const handleGrant = async () => {
    if (!newUserId.trim()) return;
    setGranting(true);
    try {
      await grantShare(newUserId.trim(), newRole);
      setShowModal(false);
      setNewUserId("");
    } catch (e) {
      Alert.alert("Lỗi", e instanceof Error ? e.message : "Không thể thêm share");
    } finally {
      setGranting(false);
    }
  };

  const handleRevoke = (share: AgentShare) => {
    Alert.alert(
      "Xác nhận",
      `Xóa quyền truy cập của "${share.user_id}"?`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: async () => {
            try {
              await revokeShare(share.user_id);
            } catch (e) {
              Alert.alert("Lỗi", e instanceof Error ? e.message : "Không thể xóa share");
            }
          },
        },
      ],
    );
  };

  const fmtDate = (iso?: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    if (diff < 3600000) return `${Math.floor(diff / 60000)}p trước`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h trước`;
    return `${Math.floor(diff / 86400000)}d trước`;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 4 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.titleWrap}>
          <Text style={[styles.title, { color: colors.foreground }]}>Shares</Text>
          {agentName && (
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]} numberOfLines={1}>
              {agentName}
            </Text>
          )}
        </View>
        <TouchableOpacity onPress={load} style={[styles.iconBtn, { backgroundColor: colors.muted }]} activeOpacity={0.7}>
          {loading ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="refresh-outline" size={15} color={colors.mutedForeground} />}
        </TouchableOpacity>
        {connected && (
          <TouchableOpacity
            onPress={() => setShowModal(true)}
            style={[styles.iconBtn, { backgroundColor: colors.primary }]}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={18} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {error && (
        <View style={[styles.errorBanner, { backgroundColor: colors.destructive + "15" }]}>
          <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
        </View>
      )}

      {/* Summary */}
      <View style={styles.summaryRow}>
        {Object.entries(ROLE_CONFIG).map(([role, cfg]) => {
          const count = shares.filter((s) => s.role === role).length;
          return (
            <View key={role} style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sumCount, { color: cfg.color }]}>{count}</Text>
              <Text style={[styles.sumLabel, { color: colors.mutedForeground }]}>{cfg.label}</Text>
            </View>
          );
        })}
        <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sumCount, { color: colors.foreground }]}>{shares.length}</Text>
          <Text style={[styles.sumLabel, { color: colors.mutedForeground }]}>Total</Text>
        </View>
      </View>

      <FlatList
        data={shares}
        keyExtractor={(s) => s.user_id}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="share-social-outline" size={36} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              {connected ? "Chưa có ai được chia sẻ" : "Chưa kết nối"}
            </Text>
            {connected && (
              <TouchableOpacity onPress={() => setShowModal(true)} activeOpacity={0.7}>
                <Text style={[styles.addLink, { color: colors.primary }]}>Thêm người dùng +</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        renderItem={({ item }) => {
          const roleCfg = ROLE_CONFIG[item.role] ?? ROLE_CONFIG.user;
          return (
            <View style={[styles.shareCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.avatar, { backgroundColor: roleCfg.color + "20" }]}>
                <Ionicons name={roleCfg.icon} size={18} color={roleCfg.color} />
              </View>
              <View style={styles.shareInfo}>
                <Text style={[styles.userId, { color: colors.foreground }]}>{item.user_id}</Text>
                <View style={styles.metaRow}>
                  <View style={[styles.roleBadge, { backgroundColor: roleCfg.color + "20" }]}>
                    <Text style={[styles.roleText, { color: roleCfg.color }]}>{roleCfg.label}</Text>
                  </View>
                  {item.created_at && (
                    <Text style={[styles.dateText, { color: colors.mutedForeground }]}>{fmtDate(item.created_at)}</Text>
                  )}
                </View>
              </View>
              <TouchableOpacity
                onPress={() => handleRevoke(item)}
                style={[styles.revokeBtn, { backgroundColor: colors.destructive + "15" }]}
                activeOpacity={0.7}
              >
                <Ionicons name="person-remove-outline" size={15} color={colors.destructive} />
              </TouchableOpacity>
            </View>
          );
        }}
      />

      {/* Add Share Modal */}
      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Thêm người dùng</Text>
              <TouchableOpacity onPress={() => setShowModal(false)} activeOpacity={0.7}>
                <Ionicons name="close" size={22} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>User ID</Text>
            <TextInput
              style={[styles.fieldInput, { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.foreground }]}
              value={newUserId}
              onChangeText={setNewUserId}
              placeholder="user_id hoặc email..."
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Vai trò</Text>
            <View style={styles.roleRow}>
              {(["user", "admin"] as const).map((r) => {
                const cfg = ROLE_CONFIG[r];
                const selected = newRole === r;
                return (
                  <TouchableOpacity
                    key={r}
                    onPress={() => setNewRole(r)}
                    style={[styles.roleOption, {
                      backgroundColor: selected ? cfg.color + "20" : colors.secondary,
                      borderColor: selected ? cfg.color + "60" : colors.border,
                    }]}
                    activeOpacity={0.7}
                  >
                    <Ionicons name={cfg.icon} size={15} color={selected ? cfg.color : colors.mutedForeground} />
                    <Text style={[styles.roleOptionText, { color: selected ? cfg.color : colors.mutedForeground }]}>{cfg.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={[styles.grantBtn, { backgroundColor: colors.primary, opacity: granting ? 0.7 : 1 }]}
              onPress={handleGrant}
              disabled={granting || !newUserId.trim()}
              activeOpacity={0.7}
            >
              {granting
                ? <ActivityIndicator size="small" color="#fff" />
                : <Ionicons name="checkmark-outline" size={16} color="#fff" />}
              <Text style={styles.grantBtnText}>Cấp quyền</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingBottom: 10, gap: 8 },
  backBtn: { padding: 4 },
  titleWrap: { flex: 1 },
  title: { fontSize: 20, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  subtitle: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  iconBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  errorBanner: { marginHorizontal: 16, marginBottom: 8, borderRadius: 10, padding: 10 },
  errorText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  summaryRow: { flexDirection: "row", gap: 10, paddingHorizontal: 16, marginBottom: 12 },
  summaryCard: { flex: 1, borderRadius: 14, borderWidth: 1, padding: 12, alignItems: "center" },
  sumCount: { fontSize: 20, fontFamily: "Inter_700Bold" },
  sumLabel: { fontSize: 11, fontFamily: "Inter_500Medium", marginTop: 2 },
  list: { paddingHorizontal: 14, paddingTop: 4 },
  shareCard: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 16, borderWidth: 1, padding: 14 },
  avatar: { width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  shareInfo: { flex: 1 },
  userId: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  roleBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  roleText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  dateText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  revokeBtn: { width: 34, height: 34, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  emptyWrap: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  addLink: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.6)" },
  modalContent: { borderRadius: 24, borderWidth: 1, padding: 20, gap: 14, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  modalTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  fieldLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5 },
  fieldInput: { borderRadius: 12, borderWidth: 1, padding: 13, fontSize: 14, fontFamily: "Inter_400Regular" },
  roleRow: { flexDirection: "row", gap: 10 },
  roleOption: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 12, borderWidth: 1, paddingVertical: 11 },
  roleOptionText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  grantBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 14, paddingVertical: 13 },
  grantBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
