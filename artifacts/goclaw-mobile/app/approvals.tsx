import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useApprovals, ApprovalItem } from "@/hooks/useApprovals";
import * as Haptics from "expo-haptics";
import { SearchBar } from "@/components/SearchBar";

const RISK_CONFIG = {
  low: { color: "#22c55e", label: "Low risk" },
  medium: { color: "#f59e0b", label: "Medium risk" },
  high: { color: "#ef4444", label: "High risk" },
};

function useCountdown(requestedAt: string, timeoutMinutes = 5): { remaining: number; urgent: boolean } {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    const calc = () => {
      const elapsed = (Date.now() - new Date(requestedAt).getTime()) / 1000;
      const total = timeoutMinutes * 60;
      return Math.max(0, total - elapsed);
    };

    setRemaining(calc());
    const interval = setInterval(() => setRemaining(calc()), 1000);
    return () => clearInterval(interval);
  }, [requestedAt, timeoutMinutes]);

  return { remaining, urgent: remaining < 60 && remaining > 0 };
}

function fmtCountdown(secs: number): string {
  if (secs <= 0) return "Hết hạn";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function ApprovalCard({
  item,
  selected,
  onSelect,
  onApprove,
  onDeny,
  colors,
}: {
  item: ApprovalItem;
  selected: boolean;
  onSelect: () => void;
  onApprove: () => void;
  onDeny: () => void;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
}) {
  const isPending = item.status === "pending";
  const risk = item.risk_level ?? "medium";
  const riskCfg = RISK_CONFIG[risk];
  const { remaining, urgent } = useCountdown(item.requested_at);

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: selected ? colors.primary + "70" : urgent ? "#f59e0b50" : colors.border,
        },
      ]}
      activeOpacity={0.95}
      onLongPress={isPending ? onSelect : undefined}
    >
      <View style={styles.cardHeader}>
        {/* Checkbox for bulk select */}
        {isPending && (
          <TouchableOpacity onPress={onSelect} style={styles.checkboxWrap} activeOpacity={0.7}>
            <View style={[styles.checkbox, { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primary : "transparent" }]}>
              {selected && <Ionicons name="checkmark" size={12} color="#fff" />}
            </View>
          </TouchableOpacity>
        )}

        <View style={[styles.toolIcon, { backgroundColor: "#60a5fa20" }]}>
          <Ionicons name="settings-outline" size={18} color="#60a5fa" />
        </View>
        <View style={styles.cardTitleArea}>
          <Text style={[styles.toolName, { color: colors.foreground }]}>{item.tool_name}</Text>
          <Text style={[styles.agentName, { color: colors.mutedForeground }]}>
            {item.agent_name ?? item.agent_id ?? "Agent"} · {new Date(item.requested_at).toLocaleTimeString("vi", { hour: "2-digit", minute: "2-digit" })}
          </Text>
        </View>

        <View style={styles.rightBadges}>
          <View style={[styles.riskBadge, { backgroundColor: riskCfg.color + "20", borderColor: riskCfg.color + "40" }]}>
            <Text style={[styles.riskText, { color: riskCfg.color }]}>{riskCfg.label}</Text>
          </View>
          {isPending && (
            <View style={[styles.countdownBadge, { backgroundColor: urgent ? "#f59e0b20" : colors.secondary, borderColor: urgent ? "#f59e0b60" : colors.border }]}>
              <Ionicons name="time-outline" size={10} color={urgent ? "#f59e0b" : colors.mutedForeground} />
              <Text style={[styles.countdownText, { color: urgent ? "#f59e0b" : colors.mutedForeground }]}>
                {fmtCountdown(remaining)}
              </Text>
            </View>
          )}
        </View>
      </View>

      {urgent && isPending && (
        <View style={[styles.urgentBanner, { backgroundColor: "#f59e0b15", borderColor: "#f59e0b40" }]}>
          <Ionicons name="warning-outline" size={12} color="#f59e0b" />
          <Text style={[styles.urgentText, { color: "#f59e0b" }]}>Sắp hết hạn — cần xử lý ngay</Text>
        </View>
      )}

      {item.description && (
        <Text style={[styles.description, { color: colors.mutedForeground }]}>{item.description}</Text>
      )}

      {item.args && Object.keys(item.args).length > 0 && (
        <View style={[styles.argsBox, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
          <Text style={[styles.argsLabel, { color: colors.mutedForeground }]}>Arguments</Text>
          {Object.entries(item.args).map(([k, v]) => (
            <View key={k} style={styles.argRow}>
              <Text style={[styles.argKey, { color: colors.primary }]}>{k}:</Text>
              <Text style={[styles.argValue, { color: colors.foreground }]} numberOfLines={2}>
                {typeof v === "object" ? JSON.stringify(v) : String(v)}
              </Text>
            </View>
          ))}
        </View>
      )}

      {isPending ? (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.denyBtn, { borderColor: colors.destructive + "60" }]}
            onPress={onDeny}
            activeOpacity={0.8}
          >
            <Ionicons name="close" size={16} color={colors.destructive} />
            <Text style={[styles.denyText, { color: colors.destructive }]}>Từ chối</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.approveBtn, { backgroundColor: colors.primary }]}
            onPress={onApprove}
            activeOpacity={0.8}
          >
            <Ionicons name="checkmark" size={16} color="#fff" />
            <Text style={styles.approveText}>Cho phép</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={[styles.resolvedRow, { borderTopColor: colors.border }]}>
          <Ionicons
            name={item.status === "approved" ? "checkmark-circle" : "close-circle"}
            size={15}
            color={item.status === "approved" ? "#22c55e" : colors.destructive}
          />
          <Text style={[styles.resolvedText, { color: item.status === "approved" ? "#22c55e" : colors.destructive }]}>
            {item.status === "approved" ? "Đã cho phép" : "Đã từ chối"}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function ApprovalsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { approvals, loading, pendingCount, approve, deny, refresh } = useApprovals();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = async () => { setRefreshing(true); await refresh(); setRefreshing(false); };
  const topPad = insets.top;

  const handleApprove = async (id: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await approve(id);
    setSelectedIds((prev) => { const s = new Set(prev); s.delete(id); return s; });
  };

  const handleDeny = (id: string) => {
    Alert.alert(
      "Từ chối tool execution",
      "Bạn có chắc muốn từ chối? Agent sẽ nhận được lỗi permission.",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Từ chối",
          style: "destructive",
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            await deny(id, "Denied by user");
            setSelectedIds((prev) => { const s = new Set(prev); s.delete(id); return s; });
          },
        },
      ],
    );
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return s;
    });
  };

  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const allPending = approvals.filter((a) => a.status === "pending");
  const allResolved = approvals.filter((a) => a.status !== "pending");

  const filterList = <T extends { tool_name: string; agent_name?: string; agent_id?: string; description?: string }>(list: T[]) => {
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter((a) =>
      a.tool_name.toLowerCase().includes(q) ||
      (a.agent_name ?? a.agent_id ?? "").toLowerCase().includes(q) ||
      (a.description ?? "").toLowerCase().includes(q),
    );
  };

  const pending = filterList(allPending);
  const resolved = filterList(allResolved);
  const selectedPending = allPending.filter((a) => selectedIds.has(a.id));
  const hasSelection = selectedIds.size > 0;

  const bulkApprove = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    selectedPending.forEach((a) => approve(a.id));
    setSelectedIds(new Set());
  };

  const bulkDeny = () => {
    Alert.alert(
      `Từ chối ${selectedPending.length} requests`,
      "Tất cả các requests đã chọn sẽ bị từ chối.",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Từ chối",
          style: "destructive",
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            selectedPending.forEach((a) => deny(a.id, "Bulk denied by user"));
            setSelectedIds(new Set());
          },
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
          <Text style={[styles.title, { color: colors.foreground }]}>Approvals</Text>
          {pendingCount > 0 && (
            <View style={[styles.countBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.countText}>{pendingCount}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          onPress={() => setShowSearch((v) => !v)}
          style={[styles.iconBtn, { backgroundColor: showSearch ? colors.primary + "22" : colors.muted }]}
          activeOpacity={0.7}
        >
          <Ionicons name="search-outline" size={15} color={showSearch ? colors.primary : colors.mutedForeground} />
        </TouchableOpacity>
        <TouchableOpacity onPress={refresh} style={[styles.iconBtn, { backgroundColor: colors.muted }]} activeOpacity={0.7}>
          {loading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons name="refresh-outline" size={16} color={colors.mutedForeground} />
          )}
        </TouchableOpacity>
      </View>

      {showSearch && (
        <View style={styles.searchWrap}>
          <SearchBar value={search} onChangeText={setSearch} placeholder="Tìm tool, agent..." />
        </View>
      )}

      {pendingCount === 0 && !loading && (
        <View style={[styles.emptyBanner, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="shield-checkmark-outline" size={32} color="#22c55e" />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Không có yêu cầu chờ</Text>
          <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
            Tất cả tool executions đã được xử lý
          </Text>
        </View>
      )}

      {/* Bulk action bar */}
      {hasSelection && (
        <View style={[styles.bulkBar, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "40" }]}>
          <Text style={[styles.bulkBarLabel, { color: colors.primary }]}>
            Đã chọn {selectedIds.size} requests
          </Text>
          <View style={styles.bulkBarActions}>
            <TouchableOpacity
              style={[styles.bulkBarBtn, { borderColor: colors.destructive + "50" }]}
              onPress={bulkDeny}
              activeOpacity={0.7}
            >
              <Text style={[styles.bulkBarBtnText, { color: colors.destructive }]}>Từ chối</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.bulkBarBtn, { borderColor: "#22c55e50", backgroundColor: "#22c55e15" }]}
              onPress={bulkApprove}
              activeOpacity={0.7}
            >
              <Text style={[styles.bulkBarBtnText, { color: "#22c55e" }]}>Cho phép</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setSelectedIds(new Set())} activeOpacity={0.7} style={styles.clearBtn}>
              <Ionicons name="close" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      <FlatList
        data={[...pending, ...resolved]}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ApprovalCard
            item={item}
            selected={selectedIds.has(item.id)}
            onSelect={() => toggleSelect(item.id)}
            colors={colors}
            onApprove={() => handleApprove(item.id)}
            onDeny={() => handleDeny(item.id)}
          />
        )}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListHeaderComponent={
          pending.length > 1 && !hasSelection ? (
            <View style={styles.quickBulkRow}>
              <Text style={[styles.quickBulkLabel, { color: colors.mutedForeground }]}>
                {pending.length} yêu cầu đang chờ
              </Text>
              <View style={styles.quickBulkBtns}>
                <TouchableOpacity
                  style={[styles.quickBulkBtn, { borderColor: colors.destructive + "50" }]}
                  onPress={() => pending.forEach((a) => handleDeny(a.id))}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.quickBulkBtnText, { color: colors.destructive }]}>Từ chối tất cả</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.quickBulkBtn, { borderColor: "#22c55e50", backgroundColor: "#22c55e15" }]}
                  onPress={() => pending.forEach((a) => handleApprove(a.id))}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.quickBulkBtnText, { color: "#22c55e" }]}>Cho phép tất cả</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 10,
    gap: 8,
  },
  backBtn: { padding: 4 },
  titleArea: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontSize: 20, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  countBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, minWidth: 22, alignItems: "center" },
  countText: { color: "#fff", fontSize: 12, fontFamily: "Inter_700Bold" },
  iconBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  emptyBanner: { margin: 16, borderRadius: 20, borderWidth: 1, padding: 28, alignItems: "center", gap: 8 },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  emptySubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  bulkBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 14,
    marginBottom: 8,
    borderRadius: 14,
    borderWidth: 1,
    padding: 10,
    paddingHorizontal: 14,
  },
  bulkBarLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  bulkBarActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  bulkBarBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1 },
  bulkBarBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  clearBtn: { padding: 4 },
  quickBulkRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12, paddingHorizontal: 2 },
  quickBulkLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  quickBulkBtns: { flexDirection: "row", gap: 8 },
  quickBulkBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1 },
  quickBulkBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  list: { paddingHorizontal: 14, paddingTop: 8 },
  card: { borderRadius: 18, borderWidth: 1, padding: 16, gap: 12 },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  checkboxWrap: { paddingTop: 2 },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  toolIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  cardTitleArea: { flex: 1 },
  toolName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  agentName: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  rightBadges: { gap: 4, alignItems: "flex-end" },
  riskBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  riskText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  countdownBadge: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  countdownText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  urgentBanner: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 10, borderWidth: 1, padding: 8 },
  urgentText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  description: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  argsBox: { borderRadius: 12, borderWidth: 1, padding: 12, gap: 6 },
  argsLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5, marginBottom: 2 },
  argRow: { flexDirection: "row", gap: 6 },
  argKey: { fontSize: 12, fontFamily: "Inter_600SemiBold", flexShrink: 0 },
  argValue: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1 },
  actions: { flexDirection: "row", gap: 10 },
  denyBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, height: 42, borderRadius: 12, borderWidth: 1 },
  denyText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  approveBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, height: 42, borderRadius: 12 },
  approveText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  resolvedRow: { flexDirection: "row", alignItems: "center", gap: 7, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
  resolvedText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  searchWrap: { paddingHorizontal: 14, paddingBottom: 6 },
});
