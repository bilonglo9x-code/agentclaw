import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useApiKeys, ApiKeyData } from "@/hooks/useApiKeys";
import { useAuth } from "@/context/AuthContext";

const MOCK_KEYS: ApiKeyData[] = [
  { id: "k1", name: "Production API", prefix: "gck_prod_", scopes: ["chat", "agents", "sessions"], expires_at: null, last_used_at: new Date(Date.now() - 3600000).toISOString(), revoked: false, created_by: "admin", created_at: new Date(Date.now() - 86400000 * 30).toISOString(), updated_at: new Date().toISOString() },
  { id: "k2", name: "CI/CD Pipeline", prefix: "gck_ci_", scopes: ["agents", "skills"], expires_at: new Date(Date.now() + 86400000 * 60).toISOString(), last_used_at: new Date(Date.now() - 86400000).toISOString(), revoked: false, created_by: "admin", created_at: new Date(Date.now() - 86400000 * 14).toISOString(), updated_at: new Date().toISOString() },
  { id: "k3", name: "Dev Testing Key", prefix: "gck_dev_", scopes: ["chat", "agents", "skills", "traces", "logs"], expires_at: null, last_used_at: null, revoked: false, created_by: "dev-user", created_at: new Date(Date.now() - 86400000 * 7).toISOString(), updated_at: new Date().toISOString() },
  { id: "k4", name: "Old Integration", prefix: "gck_old_", scopes: ["chat"], expires_at: new Date(Date.now() - 86400000).toISOString(), last_used_at: new Date(Date.now() - 86400000 * 30).toISOString(), revoked: true, created_by: "admin", created_at: new Date(Date.now() - 86400000 * 90).toISOString(), updated_at: new Date().toISOString() },
];

const AVAILABLE_SCOPES = ["chat", "agents", "sessions", "skills", "traces", "logs", "approvals", "cron", "mcp", "channels", "providers", "vault", "memory", "teams", "contacts"];

function fmtDate(iso?: string | null): string {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 0) return `Expires in ${Math.floor(-diff / 86400000)}d`;
  if (diff < 60000) return "Just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

export default function ApiKeysScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { connected } = useAuth();
  const { apiKeys: liveKeys, loading, error, refresh, createKey, revokeKey } = useApiKeys();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [selectedScopes, setSelectedScopes] = useState<string[]>(["chat", "agents"]);
  const [creating, setCreating] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const apiKeys = connected && liveKeys.length > 0 ? liveKeys : MOCK_KEYS;
  const activeCount = apiKeys.filter((k) => !k.revoked && (!k.expires_at || new Date(k.expires_at) > new Date())).length;

  const handleRevoke = (key: ApiKeyData) => {
    Alert.alert(
      "Thu hồi API Key",
      `Bạn chắc chắn muốn thu hồi "${key.name}"? Hành động này không thể hoàn tác.`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Thu hồi",
          style: "destructive",
          onPress: () => revokeKey(key.id),
        },
      ],
    );
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await createKey({ name: newName.trim(), scopes: selectedScopes });
      if (res?.key) {
        setCreatedKey(res.key);
      } else {
        setShowCreate(false);
        setNewName("");
        setSelectedScopes(["chat", "agents"]);
      }
    } finally {
      setCreating(false);
    }
  };

  const toggleScope = (scope: string) => {
    setSelectedScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope],
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 4 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>API Keys</Text>
        <TouchableOpacity
          onPress={() => setShowCreate(true)}
          style={[styles.createBtn, { backgroundColor: colors.primary }]}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={16} color="#fff" />
          <Text style={styles.createBtnText}>Tạo mới</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sumCount, { color: "#22c55e" }]}>{activeCount}</Text>
          <Text style={[styles.sumLabel, { color: colors.mutedForeground }]}>Active</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sumCount, { color: colors.foreground }]}>{apiKeys.length}</Text>
          <Text style={[styles.sumLabel, { color: colors.mutedForeground }]}>Total</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sumCount, { color: "#ef4444" }]}>{apiKeys.filter((k) => k.revoked).length}</Text>
          <Text style={[styles.sumLabel, { color: colors.mutedForeground }]}>Revoked</Text>
        </View>
      </View>

      {error && (
        <View style={[styles.errorBanner, { backgroundColor: colors.destructive + "15" }]}>
          <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
        </View>
      )}

      <FlatList
        data={apiKeys}
        keyExtractor={(k) => k.id}
        renderItem={({ item }) => {
          const isExpired = item.expires_at && new Date(item.expires_at) < new Date();
          const isActive = !item.revoked && !isExpired;
          return (
            <View style={[styles.keyCard, { backgroundColor: colors.card, borderColor: item.revoked ? colors.border : isActive ? colors.border : "#f59e0b40" }]}>
              <View style={styles.keyTop}>
                <View style={[styles.keyIcon, { backgroundColor: isActive ? colors.primary + "20" : colors.muted }]}>
                  <Ionicons name="key-outline" size={18} color={isActive ? colors.primary : colors.mutedForeground} />
                </View>
                <View style={styles.keyInfo}>
                  <View style={styles.keyNameRow}>
                    <Text style={[styles.keyName, { color: colors.foreground }]}>{item.name}</Text>
                    {item.revoked && (
                      <View style={[styles.revokedBadge, { backgroundColor: "#ef444420" }]}>
                        <Text style={[styles.revokedText, { color: "#ef4444" }]}>Revoked</Text>
                      </View>
                    )}
                    {isExpired && !item.revoked && (
                      <View style={[styles.revokedBadge, { backgroundColor: "#f59e0b20" }]}>
                        <Text style={[styles.revokedText, { color: "#f59e0b" }]}>Expired</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.keyPrefix, { color: colors.mutedForeground }]} selectable>{item.prefix}••••••••</Text>
                </View>
                {isActive && (
                  <TouchableOpacity
                    onPress={() => handleRevoke(item)}
                    style={[styles.revokeBtn, { borderColor: colors.border }]}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.revokeBtnText, { color: colors.destructive }]}>Revoke</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Scopes */}
              <View style={styles.scopesRow}>
                {item.scopes.map((s) => (
                  <View key={s} style={[styles.scopeChip, { backgroundColor: colors.muted }]}>
                    <Text style={[styles.scopeText, { color: colors.mutedForeground }]}>{s}</Text>
                  </View>
                ))}
              </View>

              {/* Stats */}
              <View style={[styles.keyStats, { borderTopColor: colors.border }]}>
                <View style={styles.statItem}>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Last used</Text>
                  <Text style={[styles.statValue, { color: colors.foreground }]}>{fmtDate(item.last_used_at)}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Expires</Text>
                  <Text style={[styles.statValue, { color: isExpired ? "#ef4444" : colors.foreground }]}>
                    {item.expires_at ? fmtDate(item.expires_at) : "Never"}
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Created</Text>
                  <Text style={[styles.statValue, { color: colors.foreground }]}>{fmtDate(item.created_at)}</Text>
                </View>
              </View>
            </View>
          );
        }}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 40 }]}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="key-outline" size={36} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Không có API keys</Text>
          </View>
        }
      />

      {/* Create modal */}
      <Modal visible={showCreate} transparent animationType="slide" onRequestClose={() => setShowCreate(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Tạo API Key mới</Text>
              <TouchableOpacity onPress={() => { setShowCreate(false); setCreatedKey(null); }} activeOpacity={0.7}>
                <Ionicons name="close" size={22} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            {createdKey ? (
              <View style={styles.createdKeyBox}>
                <Ionicons name="checkmark-circle" size={32} color="#22c55e" style={{ alignSelf: "center" }} />
                <Text style={[styles.createdTitle, { color: colors.foreground }]}>Key đã được tạo!</Text>
                <Text style={[styles.createdWarning, { color: "#f59e0b" }]}>
                  ⚠️ Sao chép key này ngay. Nó sẽ không hiển thị lại.
                </Text>
                <View style={[styles.keyBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Text style={[styles.keyText, { color: colors.foreground }]} selectable numberOfLines={3}>{createdKey}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.submitBtn, { backgroundColor: colors.primary }]}
                  onPress={() => { setShowCreate(false); setCreatedKey(null); setNewName(""); setSelectedScopes(["chat", "agents"]); }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.submitBtnText}>Đóng</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Tên</Text>
                <TextInput
                  value={newName}
                  onChangeText={setNewName}
                  placeholder="VD: Production API"
                  placeholderTextColor={colors.mutedForeground}
                  style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                />
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Scopes</Text>
                <View style={styles.scopeGrid}>
                  {AVAILABLE_SCOPES.map((scope) => {
                    const selected = selectedScopes.includes(scope);
                    return (
                      <TouchableOpacity
                        key={scope}
                        onPress={() => toggleScope(scope)}
                        style={[styles.scopeOption, { backgroundColor: selected ? colors.primary + "20" : colors.muted, borderColor: selected ? colors.primary + "55" : colors.border }]}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.scopeOptionText, { color: selected ? colors.primary : colors.mutedForeground }]}>{scope}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <TouchableOpacity
                  style={[styles.submitBtn, { backgroundColor: !newName.trim() ? colors.muted : colors.primary }]}
                  onPress={handleCreate}
                  disabled={!newName.trim() || creating}
                  activeOpacity={0.8}
                >
                  {creating ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={[styles.submitBtnText, { color: !newName.trim() ? colors.mutedForeground : "#fff" }]}>Tạo Key</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
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
  title: { flex: 1, fontSize: 20, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  createBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12 },
  createBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#fff" },
  summaryRow: { flexDirection: "row", gap: 10, paddingHorizontal: 16, marginBottom: 12 },
  summaryCard: { flex: 1, borderRadius: 14, borderWidth: 1, padding: 12, alignItems: "center" },
  sumCount: { fontSize: 20, fontFamily: "Inter_700Bold" },
  sumLabel: { fontSize: 11, fontFamily: "Inter_500Medium", marginTop: 2 },
  errorBanner: { marginHorizontal: 16, marginBottom: 8, borderRadius: 10, padding: 10 },
  errorText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  list: { paddingHorizontal: 14, paddingTop: 4 },
  keyCard: { borderRadius: 18, borderWidth: 1, overflow: "hidden" },
  keyTop: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  keyIcon: { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  keyInfo: { flex: 1 },
  keyNameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  keyName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  revokedBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 7 },
  revokedText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  keyPrefix: { fontSize: 12, fontFamily: "monospace", marginTop: 3 },
  revokeBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1 },
  revokeBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  scopesRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, paddingHorizontal: 14, paddingBottom: 10 },
  scopeChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  scopeText: { fontSize: 10, fontFamily: "Inter_400Regular" },
  keyStats: { flexDirection: "row", borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14, paddingVertical: 10 },
  statItem: { flex: 1, gap: 2 },
  statLabel: { fontSize: 9, fontFamily: "Inter_400Regular" },
  statValue: { fontSize: 11, fontFamily: "Inter_500Medium" },
  modalOverlay: { flex: 1, backgroundColor: "#00000080", justifyContent: "flex-end" },
  modalContent: { borderRadius: 28, borderWidth: 1, margin: 10, padding: 20, paddingBottom: 34 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  fieldLabel: { fontSize: 12, fontFamily: "Inter_500Medium", marginBottom: 6, marginTop: 10 },
  input: { borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: "Inter_400Regular" },
  scopeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  scopeOption: { paddingHorizontal: 11, paddingVertical: 6, borderRadius: 12, borderWidth: 1 },
  scopeOptionText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  submitBtn: { marginTop: 20, borderRadius: 16, paddingVertical: 14, alignItems: "center" },
  submitBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#fff" },
  createdKeyBox: { gap: 12 },
  createdTitle: { fontSize: 17, fontFamily: "Inter_700Bold", textAlign: "center" },
  createdWarning: { fontSize: 13, fontFamily: "Inter_500Medium", textAlign: "center" },
  keyBox: { borderRadius: 14, borderWidth: 1, padding: 14 },
  keyText: { fontSize: 12, fontFamily: "monospace" },
  emptyWrap: { alignItems: "center", paddingTop: 80, gap: 10 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
});
