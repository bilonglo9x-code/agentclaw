import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
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
import { useApprovals, ApprovalItem } from "@/hooks/useApprovals";
import * as Haptics from "expo-haptics";

const RISK_CONFIG = {
  low: { color: "#22c55e", label: "Low risk" },
  medium: { color: "#f59e0b", label: "Medium risk" },
  high: { color: "#ef4444", label: "High risk" },
};

function ApprovalCard({
  item,
  onApprove,
  onDeny,
  colors,
}: {
  item: ApprovalItem;
  onApprove: () => void;
  onDeny: () => void;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
}) {
  const isPending = item.status === "pending";
  const risk = item.risk_level ?? "medium";
  const riskCfg = RISK_CONFIG[risk];

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.toolIcon, { backgroundColor: "#60a5fa20" }]}>
          <Ionicons name="settings-outline" size={18} color="#60a5fa" />
        </View>
        <View style={styles.cardTitleArea}>
          <Text style={[styles.toolName, { color: colors.foreground }]}>{item.tool_name}</Text>
          <Text style={[styles.agentName, { color: colors.mutedForeground }]}>
            {item.agent_name ?? item.agent_id ?? "Agent"} · {new Date(item.requested_at).toLocaleTimeString("vi", { hour: "2-digit", minute: "2-digit" })}
          </Text>
        </View>
        <View style={[styles.riskBadge, { backgroundColor: riskCfg.color + "20", borderColor: riskCfg.color + "40" }]}>
          <Text style={[styles.riskText, { color: riskCfg.color }]}>{riskCfg.label}</Text>
        </View>
      </View>

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
    </View>
  );
}

export default function ApprovalsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { approvals, loading, pendingCount, approve, deny, refresh } = useApprovals();
  const [denyingId, setDenyingId] = useState<string | null>(null);
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const handleApprove = async (id: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await approve(id);
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
          },
        },
      ],
    );
  };

  const pending = approvals.filter((a) => a.status === "pending");
  const resolved = approvals.filter((a) => a.status !== "pending");

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
        <TouchableOpacity onPress={refresh} style={[styles.iconBtn, { backgroundColor: colors.muted }]} activeOpacity={0.7}>
          {loading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons name="refresh-outline" size={16} color={colors.mutedForeground} />
          )}
        </TouchableOpacity>
      </View>

      {pendingCount === 0 && !loading && (
        <View style={[styles.emptyBanner, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="shield-checkmark-outline" size={32} color="#22c55e" />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Không có yêu cầu chờ</Text>
          <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
            Tất cả tool executions đã được xử lý
          </Text>
        </View>
      )}

      <FlatList
        data={[...pending, ...resolved]}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ApprovalCard
            item={item}
            colors={colors}
            onApprove={() => handleApprove(item.id)}
            onDeny={() => handleDeny(item.id)}
          />
        )}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListHeaderComponent={
          pending.length > 1 ? (
            <View style={styles.bulkRow}>
              <Text style={[styles.bulkLabel, { color: colors.mutedForeground }]}>
                {pending.length} yêu cầu đang chờ
              </Text>
              <View style={styles.bulkBtns}>
                <TouchableOpacity
                  style={[styles.bulkBtn, { borderColor: colors.destructive + "50" }]}
                  onPress={() => pending.forEach((a) => handleDeny(a.id))}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.bulkBtnText, { color: colors.destructive }]}>Từ chối tất cả</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.bulkBtn, { borderColor: "#22c55e50", backgroundColor: "#22c55e15" }]}
                  onPress={() => pending.forEach((a) => handleApprove(a.id))}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.bulkBtnText, { color: "#22c55e" }]}>Cho phép tất cả</Text>
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
  bulkRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12, paddingHorizontal: 2 },
  bulkLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  bulkBtns: { flexDirection: "row", gap: 8 },
  bulkBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1 },
  bulkBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  list: { paddingHorizontal: 14, paddingTop: 8 },
  card: { borderRadius: 18, borderWidth: 1, padding: 16, gap: 12 },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  toolIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  cardTitleArea: { flex: 1 },
  toolName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  agentName: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  riskBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  riskText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
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
});
