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
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useConfigPermissions, ConfigPermission } from "@/hooks/useConfigPermissions";
import { useAuth } from "@/context/AuthContext";

const ACCESS_CONFIG: Record<string, { color: string; label: string; icon: keyof typeof Ionicons["glyphMap"] }> = {
  read: { color: "#60a5fa", label: "Read", icon: "eye-outline" },
  write: { color: "#f59e0b", label: "Write", icon: "pencil-outline" },
  admin: { color: "#f97316", label: "Admin", icon: "shield-outline" },
};

const MOCK_PERMISSIONS: ConfigPermission[] = [
  { id: "p1", user_id: "user_admin_01", display_name: "Nguyễn Admin", path: "*", access: "admin", granted_by: "owner", granted_at: new Date(Date.now() - 86400000 * 30).toISOString() },
  { id: "p2", user_id: "user_ops_02", display_name: "Trần Operator", path: "providers.*", access: "write", granted_by: "admin", granted_at: new Date(Date.now() - 86400000 * 14).toISOString() },
  { id: "p3", user_id: "user_dev_03", display_name: "Lê Developer", path: "agents.*", access: "read", granted_by: "admin", granted_at: new Date(Date.now() - 86400000 * 7).toISOString() },
  { id: "p4", user_id: "user_viewer_04", display_name: "Viewer Only", path: "channels.*", access: "read", granted_by: "admin", granted_at: new Date(Date.now() - 86400000 * 2).toISOString() },
];

const COMMON_PATHS = ["*", "agents.*", "providers.*", "channels.*", "skills.*", "cron.*", "mcp.*", "memory.*"];

function fmtDate(iso?: string): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h trước`;
  return `${Math.floor(diff / 86400000)}d trước`;
}

function PermRow({
  item,
  connected,
  onRevoke,
  colors,
}: {
  item: ConfigPermission;
  connected: boolean;
  onRevoke: (id: string, userId: string) => void;
  colors: ReturnType<typeof useColors>;
}) {
  const cfg = ACCESS_CONFIG[item.access] ?? ACCESS_CONFIG.read;
  return (
    <View style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.rowAvatar, { backgroundColor: cfg.color + "18" }]}>
        <Ionicons name={cfg.icon} size={16} color={cfg.color} />
      </View>
      <View style={styles.rowInfo}>
        <Text style={[styles.rowName, { color: colors.foreground }]} numberOfLines={1}>
          {item.display_name ?? item.user_id}
        </Text>
        <Text style={[styles.rowPath, { color: colors.mutedForeground }]} numberOfLines={1}>
          {item.user_id} · path: <Text style={{ color: colors.primary }}>{item.path}</Text>
        </Text>
        <Text style={[styles.rowMeta, { color: colors.mutedForeground }]}>
          Cấp bởi {item.granted_by ?? "—"} · {fmtDate(item.granted_at)}
        </Text>
      </View>
      <View style={styles.rowRight}>
        <View style={[styles.accessBadge, { backgroundColor: cfg.color + "18", borderColor: cfg.color + "40" }]}>
          <Text style={[styles.accessText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
        {connected && (
          <TouchableOpacity
            onPress={() => onRevoke(item.id, item.user_id)}
            style={[styles.revokeBtn, { backgroundColor: colors.destructive + "15" }]}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={13} color={colors.destructive} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export default function PermissionsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { connected, isOwner } = useAuth();
  const { permissions: livePerms, loading, error, refresh, grantPermission, revokePermission } = useConfigPermissions();
  const topPad = insets.top;

  const permissions = connected && livePerms.length > 0 ? livePerms : MOCK_PERMISSIONS;

  const [showGrant, setShowGrant] = useState(false);
  const [granting, setGranting] = useState(false);
  const [userId, setUserId] = useState("");
  const [path, setPath] = useState("*");
  const [access, setAccess] = useState<"read" | "write" | "admin">("read");
  const [searchText, setSearchText] = useState("");

  const filtered = permissions.filter(
    (p) =>
      !searchText ||
      p.user_id.toLowerCase().includes(searchText.toLowerCase()) ||
      (p.display_name ?? "").toLowerCase().includes(searchText.toLowerCase()) ||
      p.path.toLowerCase().includes(searchText.toLowerCase()),
  );

  const handleGrant = async () => {
    if (!userId.trim() || !path.trim()) {
      Alert.alert("Thiếu thông tin", "Vui lòng nhập User ID và path");
      return;
    }
    setGranting(true);
    try {
      await grantPermission({ userId: userId.trim(), path: path.trim(), access });
      setShowGrant(false);
      setUserId("");
      setPath("*");
      setAccess("read");
    } catch (e) {
      Alert.alert("Lỗi", e instanceof Error ? e.message : "Cấp quyền thất bại");
    } finally {
      setGranting(false);
    }
  };

  const handleRevoke = (id: string, uid: string) => {
    Alert.alert("Thu hồi quyền", `Thu hồi quyền config của "${uid}"?`, [
      { text: "Hủy", style: "cancel" },
      {
        text: "Thu hồi",
        style: "destructive",
        onPress: async () => {
          try {
            await revokePermission(id);
          } catch (e) {
            Alert.alert("Lỗi", e instanceof Error ? e.message : "Thu hồi thất bại");
          }
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Config Permissions</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: colors.secondary }]}
            onPress={refresh}
            activeOpacity={0.7}
          >
            <Ionicons name="refresh-outline" size={17} color={colors.mutedForeground} />
          </TouchableOpacity>
          {(isOwner || connected) && (
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: colors.primary }]}
              onPress={() => setShowGrant(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="add" size={17} color="#fff" />
              <Text style={styles.addBtnText}>Cấp quyền</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Info banner */}
      <View style={[styles.infoBanner, { backgroundColor: colors.card, borderColor: colors.border, marginHorizontal: 16, marginBottom: 8 }]}>
        <Ionicons name="information-circle-outline" size={14} color={colors.mutedForeground} />
        <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
          Quản lý quyền truy cập cấu hình hệ thống theo user và path. Path <Text style={{ color: colors.primary }}>*</Text> = toàn bộ config.
        </Text>
      </View>

      {/* Search */}
      <View style={[styles.searchWrap, { backgroundColor: colors.secondary, borderColor: colors.border, marginHorizontal: 16, marginBottom: 8 }]}>
        <Ionicons name="search-outline" size={15} color={colors.mutedForeground} />
        <TextInput
          style={[styles.searchInput, { color: colors.foreground }]}
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Tìm user ID, path..."
          placeholderTextColor={colors.mutedForeground}
        />
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : error ? (
        <View style={[styles.errorBox, { backgroundColor: colors.destructive + "15", borderColor: colors.destructive + "30", margin: 16 }]}>
          <Ionicons name="alert-circle-outline" size={14} color={colors.destructive} />
          <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(p) => p.id}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={() => (
            <View style={styles.emptyWrap}>
              <Ionicons name="lock-closed-outline" size={36} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Chưa có quyền nào</Text>
            </View>
          )}
          renderItem={({ item }) => (
            <PermRow item={item} connected={connected} onRevoke={handleRevoke} colors={colors} />
          )}
        />
      )}

      {/* Grant Modal */}
      <Modal visible={showGrant} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowGrant(false)}>
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowGrant(false)} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Cấp quyền Config</Text>
            <View style={{ width: 22 }} />
          </View>

          <View style={styles.modalContent}>
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>User ID *</Text>
              <View style={[styles.inputWrap, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                <Ionicons name="person-outline" size={15} color={colors.mutedForeground} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  value={userId}
                  onChangeText={setUserId}
                  placeholder="user_abc123"
                  placeholderTextColor={colors.mutedForeground}
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Config Path *</Text>
              <View style={[styles.inputWrap, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                <Ionicons name="git-branch-outline" size={15} color={colors.mutedForeground} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  value={path}
                  onChangeText={setPath}
                  placeholder="agents.*"
                  placeholderTextColor={colors.mutedForeground}
                  autoCapitalize="none"
                />
              </View>
              <View style={styles.pathChips}>
                {COMMON_PATHS.map((p) => (
                  <TouchableOpacity
                    key={p}
                    onPress={() => setPath(p)}
                    style={[styles.chip, { backgroundColor: path === p ? colors.primary + "20" : colors.secondary, borderColor: path === p ? colors.primary + "50" : colors.border }]}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.chipText, { color: path === p ? colors.primary : colors.mutedForeground }]}>{p}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Mức quyền</Text>
              <View style={styles.accessRow}>
                {(["read", "write", "admin"] as const).map((a) => {
                  const cfg = ACCESS_CONFIG[a];
                  return (
                    <TouchableOpacity
                      key={a}
                      onPress={() => setAccess(a)}
                      style={[styles.accessOption, { backgroundColor: access === a ? cfg.color + "18" : colors.secondary, borderColor: access === a ? cfg.color + "50" : colors.border }]}
                      activeOpacity={0.75}
                    >
                      <Ionicons name={cfg.icon} size={14} color={access === a ? cfg.color : colors.mutedForeground} />
                      <Text style={[styles.accessOptionText, { color: access === a ? cfg.color : colors.mutedForeground }]}>{cfg.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: colors.primary, opacity: granting ? 0.7 : 1 }]}
              onPress={handleGrant}
              disabled={granting}
              activeOpacity={0.85}
            >
              {granting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>Cấp quyền</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, gap: 10 },
  backBtn: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 18, fontFamily: "Inter_700Bold" },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  iconBtn: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, height: 34, borderRadius: 10 },
  addBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  infoBanner: { flexDirection: "row", alignItems: "flex-start", gap: 7, borderRadius: 10, borderWidth: 1, padding: 10 },
  infoText: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 17 },
  searchWrap: { flexDirection: "row", alignItems: "center", borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, height: 40, gap: 8 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  list: { paddingHorizontal: 16, paddingTop: 4, gap: 8 },
  row: { flexDirection: "row", alignItems: "flex-start", borderRadius: 14, borderWidth: 1, padding: 12, gap: 10 },
  rowAvatar: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  rowPath: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  rowMeta: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 3 },
  rowRight: { alignItems: "flex-end", gap: 6 },
  accessBadge: { borderRadius: 6, borderWidth: 1, paddingHorizontal: 7, paddingVertical: 2 },
  accessText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  revokeBtn: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  errorBox: { flexDirection: "row", alignItems: "center", gap: 7, borderRadius: 10, borderWidth: 1, padding: 10 },
  errorText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
  emptyWrap: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  modal: { flex: 1 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, paddingTop: 20, borderBottomWidth: 1 },
  modalTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  modalContent: { padding: 16, gap: 4 },
  field: { marginBottom: 16 },
  fieldLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", marginBottom: 6, letterSpacing: 0.3 },
  inputWrap: { flexDirection: "row", alignItems: "center", borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, height: 46 },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  pathChips: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  chip: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5 },
  chipText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  accessRow: { flexDirection: "row", gap: 8 },
  accessOption: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, borderRadius: 10, borderWidth: 1, paddingVertical: 10 },
  accessOptionText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  submitBtn: { height: 50, borderRadius: 14, alignItems: "center", justifyContent: "center", marginTop: 8 },
  submitBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
