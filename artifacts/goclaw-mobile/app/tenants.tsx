import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  ScrollView,
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
import { useTenants, TenantData, TenantUser } from "@/hooks/useTenants";
import { useAuth } from "@/context/AuthContext";

const ROLE_CONFIG: Record<string, { color: string; label: string }> = {
  owner: { color: "#f97316", label: "Owner" },
  admin: { color: "#a78bfa", label: "Admin" },
  operator: { color: "#60a5fa", label: "Operator" },
  viewer: { color: "#71717a", label: "Viewer" },
};

const MOCK_MINE: TenantData = {
  id: "t-demo",
  name: "GoClaw Demo",
  slug: "goclaw-demo",
  plan: "pro",
  edition: "standard",
  agent_count: 6,
  user_count: 3,
  is_active: true,
  created_at: new Date(Date.now() - 86400000 * 60).toISOString(),
};

const MOCK_TENANTS: TenantData[] = [
  { id: "t1", name: "Acme Corp", slug: "acme-corp", plan: "enterprise", edition: "standard", agent_count: 12, user_count: 8, is_active: true, created_at: new Date(Date.now() - 86400000 * 90).toISOString() },
  { id: "t2", name: "Startup Alpha", slug: "startup-alpha", plan: "pro", edition: "standard", agent_count: 4, user_count: 2, is_active: true, created_at: new Date(Date.now() - 86400000 * 30).toISOString() },
  { id: "t3", name: "Dev Sandbox", slug: "dev-sandbox", plan: "free", edition: "lite", agent_count: 1, user_count: 1, is_active: false, created_at: new Date(Date.now() - 86400000 * 10).toISOString() },
];

const MOCK_USERS: TenantUser[] = [
  { user_id: "u1", display_name: "Nguyễn Văn A", email: "admin@acme.com", role: "owner", joined_at: new Date(Date.now() - 86400000 * 90).toISOString(), last_active_at: new Date(Date.now() - 3600000).toISOString() },
  { user_id: "u2", display_name: "Trần Thị B", email: "ops@acme.com", role: "operator", joined_at: new Date(Date.now() - 86400000 * 45).toISOString(), last_active_at: new Date(Date.now() - 86400000).toISOString() },
  { user_id: "u3", display_name: "Lê Văn C", email: "viewer@acme.com", role: "viewer", joined_at: new Date(Date.now() - 86400000 * 7).toISOString() },
];

function fmtDate(iso?: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return "Vừa xong";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}p`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  return `${Math.floor(diff / 86400000)}d`;
}

function PlanBadge({ plan, colors }: { plan?: string; colors: ReturnType<typeof useColors> }) {
  const planColors: Record<string, string> = {
    enterprise: "#f97316",
    pro: "#a78bfa",
    free: "#71717a",
  };
  const c = planColors[plan ?? "free"] ?? "#71717a";
  return (
    <View style={[badgeStyle.pill, { backgroundColor: c + "20", borderColor: c + "40" }]}>
      <Text style={[badgeStyle.text, { color: c }]}>{(plan ?? "free").toUpperCase()}</Text>
    </View>
  );
}

const badgeStyle = StyleSheet.create({
  pill: { borderRadius: 6, borderWidth: 1, paddingHorizontal: 7, paddingVertical: 2 },
  text: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5 },
});

function TenantCard({
  tenant,
  isMine,
  colors,
  onPress,
}: {
  tenant: TenantData;
  isMine?: boolean;
  colors: ReturnType<typeof useColors>;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: isMine ? colors.primary + "50" : colors.border },
        isMine && { borderWidth: 1.5 },
      ]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={styles.cardTop}>
        <View style={[styles.cardIcon, { backgroundColor: isMine ? colors.primary + "20" : colors.secondary }]}>
          <Ionicons name="business-outline" size={20} color={isMine ? colors.primary : colors.mutedForeground} />
        </View>
        <View style={styles.cardMeta}>
          <View style={styles.cardTitleRow}>
            <Text style={[styles.cardName, { color: colors.foreground }]} numberOfLines={1}>
              {tenant.name}
            </Text>
            {isMine && (
              <View style={[styles.minePill, { backgroundColor: colors.primary + "20", borderColor: colors.primary + "40" }]}>
                <Text style={[styles.mineText, { color: colors.primary }]}>Của bạn</Text>
              </View>
            )}
          </View>
          <Text style={[styles.cardSlug, { color: colors.mutedForeground }]}>/{tenant.slug}</Text>
        </View>
        <View style={styles.cardRight}>
          <PlanBadge plan={tenant.plan} colors={colors} />
          <View style={[styles.statusDot, { backgroundColor: tenant.is_active ? "#22c55e" : "#71717a" }]} />
        </View>
      </View>

      <View style={[styles.cardDivider, { backgroundColor: colors.border }]} />

      <View style={styles.cardStats}>
        <View style={styles.stat}>
          <Ionicons name="hardware-chip-outline" size={12} color={colors.mutedForeground} />
          <Text style={[styles.statText, { color: colors.mutedForeground }]}>{tenant.agent_count ?? 0} agents</Text>
        </View>
        <View style={styles.stat}>
          <Ionicons name="people-outline" size={12} color={colors.mutedForeground} />
          <Text style={[styles.statText, { color: colors.mutedForeground }]}>{tenant.user_count ?? 0} users</Text>
        </View>
        {tenant.edition === "lite" && (
          <View style={styles.stat}>
            <Ionicons name="flash-outline" size={12} color="#71717a" />
            <Text style={[styles.statText, { color: "#71717a" }]}>Lite</Text>
          </View>
        )}
        <Text style={[styles.statDate, { color: colors.mutedForeground }]}>
          {fmtDate(tenant.created_at)} ago
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function UserRow({ user, colors }: { user: TenantUser; colors: ReturnType<typeof useColors> }) {
  const role = ROLE_CONFIG[user.role] ?? { color: "#71717a", label: user.role };
  return (
    <View style={[styles.userRow, { borderBottomColor: colors.border }]}>
      <View style={[styles.userAvatar, { backgroundColor: role.color + "20" }]}>
        <Text style={[styles.userAvatarText, { color: role.color }]}>
          {(user.display_name ?? user.email ?? "?")[0].toUpperCase()}
        </Text>
      </View>
      <View style={styles.userInfo}>
        <Text style={[styles.userName, { color: colors.foreground }]} numberOfLines={1}>
          {user.display_name ?? "—"}
        </Text>
        <Text style={[styles.userEmail, { color: colors.mutedForeground }]} numberOfLines={1}>
          {user.email ?? user.user_id}
        </Text>
      </View>
      <View style={styles.userRight}>
        <View style={[styles.rolePill, { backgroundColor: role.color + "18", borderColor: role.color + "40" }]}>
          <Text style={[styles.roleText, { color: role.color }]}>{role.label}</Text>
        </View>
        <Text style={[styles.userActive, { color: colors.mutedForeground }]}>
          {user.last_active_at ? fmtDate(user.last_active_at) : "—"}
        </Text>
      </View>
    </View>
  );
}

export default function TenantsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { connected, isOwner, isMasterScope } = useAuth();
  const {
    tenants: liveTenants,
    mine: liveMine,
    loading,
    error,
    refresh,
    loadUsers,
    createTenant,
    updateTenant,
  } = useTenants();
  const topPad = insets.top;

  const mine = connected && liveMine ? liveMine : MOCK_MINE;
  const allTenants = connected && liveTenants.length > 0 ? liveTenants : MOCK_TENANTS;

  const [selectedTenant, setSelectedTenant] = useState<TenantData | null>(null);
  const [tenantUsers, setTenantUsers] = useState<TenantUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showDetail, setShowDetail] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newPlan, setNewPlan] = useState("pro");

  const [showEdit, setShowEdit] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");

  const openDetail = async (tenant: TenantData) => {
    setSelectedTenant(tenant);
    setTenantUsers([]);
    setShowDetail(true);
    setLoadingUsers(true);
    try {
      const users = connected ? await loadUsers(tenant.id) : MOCK_USERS;
      setTenantUsers(users.length > 0 ? users : MOCK_USERS);
    } catch {
      setTenantUsers(MOCK_USERS);
    } finally {
      setLoadingUsers(false);
    }
  };

  const openEdit = (tenant: TenantData) => {
    setSelectedTenant(tenant);
    setEditName(tenant.name);
    setEditSlug(tenant.slug);
    setShowEdit(true);
  };

  const handleCreate = async () => {
    if (!newName.trim() || !newSlug.trim()) {
      Alert.alert("Thiếu thông tin", "Vui lòng nhập tên và slug tổ chức");
      return;
    }
    setCreating(true);
    try {
      await createTenant({ name: newName.trim(), slug: newSlug.trim(), plan: newPlan });
      setShowCreate(false);
      setNewName("");
      setNewSlug("");
      setNewPlan("pro");
    } catch (e) {
      Alert.alert("Lỗi", e instanceof Error ? e.message : "Tạo tổ chức thất bại");
    } finally {
      setCreating(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedTenant || !editName.trim() || !editSlug.trim()) return;
    setEditing(true);
    try {
      await updateTenant(selectedTenant.id, { name: editName.trim(), slug: editSlug.trim() });
      setShowEdit(false);
    } catch (e) {
      Alert.alert("Lỗi", e instanceof Error ? e.message : "Cập nhật thất bại");
    } finally {
      setEditing(false);
    }
  };

  const autoSlug = (name: string) =>
    name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Tổ chức</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: colors.secondary }]}
            onPress={refresh}
            activeOpacity={0.7}
          >
            <Ionicons name="refresh-outline" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
          {(isOwner || isMasterScope) && (
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: colors.primary }]}
              onPress={() => setShowCreate(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={styles.addBtnText}>Tạo mới</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Current tenant info card */}
        {!isMasterScope && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>TỔ CHỨC HIỆN TẠI</Text>
            <TenantCard tenant={mine} isMine colors={colors} onPress={() => openDetail(mine)} />
            {(isOwner || isMasterScope) && (
              <TouchableOpacity
                style={[styles.editTenantBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => openEdit(mine)}
                activeOpacity={0.75}
              >
                <Ionicons name="pencil-outline" size={15} color={colors.mutedForeground} />
                <Text style={[styles.editTenantText, { color: colors.mutedForeground }]}>Chỉnh sửa tổ chức</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* All tenants (master scope only) */}
        {isMasterScope && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
              TẤT CẢ TỔ CHỨC ({allTenants.length})
            </Text>
            {loading ? (
              <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
            ) : error ? (
              <View style={[styles.errorBox, { backgroundColor: colors.destructive + "18", borderColor: colors.destructive + "40" }]}>
                <Ionicons name="alert-circle-outline" size={14} color={colors.destructive} />
                <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
              </View>
            ) : (
              allTenants.map((t) => (
                <TenantCard
                  key={t.id}
                  tenant={t}
                  isMine={t.id === mine.id}
                  colors={colors}
                  onPress={() => openDetail(t)}
                />
              ))
            )}
          </View>
        )}

        {/* Connection hint */}
        {!connected && (
          <View style={[styles.demoHint, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="information-circle-outline" size={14} color={colors.mutedForeground} />
            <Text style={[styles.demoHintText, { color: colors.mutedForeground }]}>
              Đang hiển thị dữ liệu mẫu. Kết nối máy chủ để xem dữ liệu thực.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Tenant Detail Modal */}
      <Modal visible={showDetail} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowDetail(false)}>
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowDetail(false)} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Chi tiết tổ chức</Text>
            {(isOwner || isMasterScope) && selectedTenant && (
              <TouchableOpacity
                onPress={() => {
                  setShowDetail(false);
                  openEdit(selectedTenant);
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="pencil-outline" size={18} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>

          {selectedTenant && (
            <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
              {/* Info rows */}
              <View style={[styles.infoBlock, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {[
                  { label: "Tên", value: selectedTenant.name },
                  { label: "Slug", value: `/${selectedTenant.slug}` },
                  { label: "Plan", value: selectedTenant.plan?.toUpperCase() ?? "FREE" },
                  { label: "Edition", value: selectedTenant.edition ?? "standard" },
                  { label: "Trạng thái", value: selectedTenant.is_active ? "Hoạt động" : "Tạm ngưng" },
                  { label: "Agents", value: String(selectedTenant.agent_count ?? 0) },
                  { label: "Users", value: String(selectedTenant.user_count ?? 0) },
                  { label: "Ngày tạo", value: selectedTenant.created_at ? new Date(selectedTenant.created_at).toLocaleDateString("vi-VN") : "—" },
                ].map((row, i, arr) => (
                  <View key={row.label} style={[styles.infoRow, i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                    <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{row.label}</Text>
                    <Text style={[styles.infoValue, { color: colors.foreground }]}>{row.value}</Text>
                  </View>
                ))}
              </View>

              {/* Members */}
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground, marginTop: 20, marginBottom: 10 }]}>
                THÀNH VIÊN
              </Text>
              {loadingUsers ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <View style={[styles.usersBlock, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  {tenantUsers.length === 0 ? (
                    <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Chưa có thành viên</Text>
                  ) : (
                    tenantUsers.map((u) => <UserRow key={u.user_id} user={u} colors={colors} />)
                  )}
                </View>
              )}
            </ScrollView>
          )}
        </View>
      </Modal>

      {/* Create Modal */}
      <Modal visible={showCreate} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowCreate(false)}>
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowCreate(false)} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Tạo tổ chức mới</Text>
            <View style={{ width: 22 }} />
          </View>
          <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Tên tổ chức *</Text>
              <View style={[styles.inputWrap, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                <Ionicons name="business-outline" size={15} color={colors.mutedForeground} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  value={newName}
                  onChangeText={(v) => {
                    setNewName(v);
                    if (!newSlug || newSlug === autoSlug(newName)) setNewSlug(autoSlug(v));
                  }}
                  placeholder="Acme Corporation"
                  placeholderTextColor={colors.mutedForeground}
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Slug *</Text>
              <View style={[styles.inputWrap, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                <Text style={[styles.slugPrefix, { color: colors.mutedForeground }]}>/</Text>
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  value={newSlug}
                  onChangeText={(v) => setNewSlug(v.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  placeholder="acme-corporation"
                  placeholderTextColor={colors.mutedForeground}
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Plan</Text>
              <View style={styles.planRow}>
                {["free", "pro", "enterprise"].map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[
                      styles.planOption,
                      { backgroundColor: newPlan === p ? colors.primary + "20" : colors.secondary, borderColor: newPlan === p ? colors.primary + "60" : colors.border },
                    ]}
                    onPress={() => setNewPlan(p)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.planOptionText, { color: newPlan === p ? colors.primary : colors.mutedForeground }]}>
                      {p.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: colors.primary, opacity: creating ? 0.7 : 1 }]}
              onPress={handleCreate}
              disabled={creating}
              activeOpacity={0.85}
            >
              {creating ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>Tạo tổ chức</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Edit Modal */}
      <Modal visible={showEdit} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowEdit(false)}>
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowEdit(false)} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Chỉnh sửa tổ chức</Text>
            <View style={{ width: 22 }} />
          </View>
          <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Tên tổ chức</Text>
              <View style={[styles.inputWrap, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                <Ionicons name="business-outline" size={15} color={colors.mutedForeground} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Tên tổ chức"
                  placeholderTextColor={colors.mutedForeground}
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Slug</Text>
              <View style={[styles.inputWrap, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                <Text style={[styles.slugPrefix, { color: colors.mutedForeground }]}>/</Text>
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  value={editSlug}
                  onChangeText={(v) => setEditSlug(v.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  placeholder="tenant-slug"
                  placeholderTextColor={colors.mutedForeground}
                  autoCapitalize="none"
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: colors.primary, opacity: editing ? 0.7 : 1 }]}
              onPress={handleEdit}
              disabled={editing}
              activeOpacity={0.85}
            >
              {editing ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>Lưu thay đổi</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 10,
  },
  backBtn: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 18, fontFamily: "Inter_700Bold" },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  iconBtn: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, height: 34, borderRadius: 10 },
  addBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },

  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 8 },

  section: { marginBottom: 20 },
  sectionLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8, marginBottom: 10 },

  card: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10 },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  cardIcon: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  cardMeta: { flex: 1, gap: 2 },
  cardTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  cardName: { fontSize: 15, fontFamily: "Inter_600SemiBold", flex: 1 },
  cardSlug: { fontSize: 12, fontFamily: "Inter_400Regular" },
  cardRight: { alignItems: "flex-end", gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  minePill: { borderRadius: 5, borderWidth: 1, paddingHorizontal: 6, paddingVertical: 1 },
  mineText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },

  cardDivider: { height: 1, marginVertical: 10 },
  cardStats: { flexDirection: "row", alignItems: "center", gap: 12 },
  stat: { flexDirection: "row", alignItems: "center", gap: 4 },
  statText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  statDate: { fontSize: 12, fontFamily: "Inter_400Regular", marginLeft: "auto" },

  editTenantBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    marginTop: 2,
  },
  editTenantText: { fontSize: 13, fontFamily: "Inter_400Regular" },

  errorBox: { flexDirection: "row", alignItems: "center", gap: 7, borderRadius: 10, borderWidth: 1, padding: 10 },
  errorText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },

  demoHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    marginTop: 4,
  },
  demoHintText: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 17 },

  // Modal
  modal: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    paddingTop: 20,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  modalContent: { padding: 16, paddingBottom: 40 },

  infoBlock: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  infoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 14, paddingVertical: 11 },
  infoLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  infoValue: { fontSize: 13, fontFamily: "Inter_600SemiBold" },

  usersBlock: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  emptyText: { fontSize: 13, fontFamily: "Inter_400Regular", padding: 16, textAlign: "center" },

  userRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    gap: 10,
  },
  userAvatar: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  userAvatarText: { fontSize: 15, fontFamily: "Inter_700Bold" },
  userInfo: { flex: 1 },
  userName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  userEmail: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  userRight: { alignItems: "flex-end", gap: 3 },
  rolePill: { borderRadius: 6, borderWidth: 1, paddingHorizontal: 7, paddingVertical: 2 },
  roleText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  userActive: { fontSize: 11, fontFamily: "Inter_400Regular" },

  // Form
  field: { marginBottom: 16 },
  fieldLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", marginBottom: 6, letterSpacing: 0.3 },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 46,
  },
  inputIcon: { marginRight: 8 },
  slugPrefix: { fontSize: 16, fontFamily: "Inter_600SemiBold", marginRight: 2 },
  input: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  planRow: { flexDirection: "row", gap: 8 },
  planOption: { flex: 1, borderRadius: 10, borderWidth: 1, alignItems: "center", paddingVertical: 10 },
  planOptionText: { fontSize: 12, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5 },
  submitBtn: { height: 50, borderRadius: 14, alignItems: "center", justifyContent: "center", marginTop: 8 },
  submitBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
