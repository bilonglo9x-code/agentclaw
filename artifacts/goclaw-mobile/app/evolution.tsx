import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useEvolution, EvolutionSuggestion } from "@/hooks/useEvolution";
import { useAgents } from "@/hooks/useAgents";
import { useAuth } from "@/context/AuthContext";

const STATUS_COLORS: Record<string, string> = {
  pending: "#f97316",
  approved: "#22c55e",
  applied: "#60a5fa",
  rejected: "#ef4444",
  rolled_back: "#a1a1aa",
};

const TYPE_ICONS: Record<string, keyof typeof Ionicons["glyphMap"]> = {
  skill_add: "flash-outline",
  skill_modify: "create-outline",
  tool_disable: "ban-outline",
  prompt_tweak: "chatbubble-ellipses-outline",
  config_change: "settings-outline",
};

const STATUS_FILTERS = ["pending", "approved", "applied", "rejected"];

function SuggestionCard({
  item,
  updating,
  onApprove,
  onReject,
  colors,
}: {
  item: EvolutionSuggestion;
  updating: boolean;
  onApprove: () => void;
  onReject: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  const statusColor = STATUS_COLORS[item.status] ?? colors.mutedForeground;
  const typeIcon = TYPE_ICONS[item.type] ?? "bulb-outline";

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.typeIcon, { backgroundColor: statusColor + "15" }]}>
          <Ionicons name={typeIcon} size={16} color={statusColor} />
        </View>
        <View style={styles.cardMeta}>
          <Text style={[styles.cardType, { color: colors.mutedForeground }]}>{item.type.replace(/_/g, " ")}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + "18" }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>{item.status}</Text>
          </View>
        </View>
        <Text style={[styles.cardTime, { color: colors.mutedForeground }]}>
          {new Date(item.created_at).toLocaleDateString("vi")}
        </Text>
      </View>

      {item.title && (
        <Text style={[styles.cardTitle, { color: colors.foreground }]}>{item.title}</Text>
      )}
      {item.content && (
        <Text style={[styles.cardContent, { color: colors.mutedForeground }]} numberOfLines={3}>
          {item.content}
        </Text>
      )}
      {item.rationale && (
        <View style={[styles.rationaleBox, { backgroundColor: colors.secondary }]}>
          <Text style={[styles.rationaleLabel, { color: colors.mutedForeground }]}>Lý do</Text>
          <Text style={[styles.rationaleText, { color: colors.foreground }]} numberOfLines={2}>
            {item.rationale}
          </Text>
        </View>
      )}

      {item.status === "pending" && (
        <View style={styles.actions}>
          <TouchableOpacity
            onPress={onReject}
            disabled={updating}
            style={[styles.rejectBtn, { backgroundColor: "#ef444415", borderColor: "#ef444430" }]}
            activeOpacity={0.7}
          >
            {updating ? <ActivityIndicator size="small" color="#ef4444" /> : <Ionicons name="close" size={14} color="#ef4444" />}
            <Text style={[styles.rejectText]}>Từ chối</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onApprove}
            disabled={updating}
            style={[styles.approveBtn, { backgroundColor: "#22c55e15", borderColor: "#22c55e30" }]}
            activeOpacity={0.7}
          >
            {updating ? <ActivityIndicator size="small" color="#22c55e" /> : <Ionicons name="checkmark" size={14} color="#22c55e" />}
            <Text style={styles.approveText}>Áp dụng</Text>
          </TouchableOpacity>
        </View>
      )}

      {item.reviewed_by && (
        <Text style={[styles.reviewedBy, { color: colors.mutedForeground }]}>
          Reviewed by {item.reviewed_by}
          {item.reviewed_at ? ` • ${new Date(item.reviewed_at).toLocaleDateString("vi")}` : ""}
        </Text>
      )}
    </View>
  );
}

export default function EvolutionScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { agentId: paramAgentId } = useLocalSearchParams<{ agentId?: string }>();
  const { connected } = useAuth();
  const { agents } = useAgents();
  const [selectedAgent, setSelectedAgent] = useState<string>(paramAgentId ?? "");
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { suggestions, toolAggs, statusFilter, setStatusFilter, loading, updating, error, refresh, updateSuggestion } =
    useEvolution(selectedAgent || undefined);

  const agent = agents.find((a) => a.id === selectedAgent);

  const handleUpdate = (id: string, status: "approved" | "rejected") => {
    Alert.alert(
      status === "approved" ? "Áp dụng đề xuất?" : "Từ chối đề xuất?",
      status === "approved"
        ? "Hệ thống sẽ tự động áp dụng thay đổi này."
        : "Đề xuất này sẽ bị đánh dấu là từ chối.",
      [
        { text: "Hủy", style: "cancel" },
        { text: status === "approved" ? "Áp dụng" : "Từ chối", onPress: () => updateSuggestion(id, status) },
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
          <Text style={[styles.title, { color: colors.foreground }]}>Evolution</Text>
          {agent && <Text style={[styles.agentTag, { color: colors.primary }]}>{agent.display_name ?? agent.agent_key}</Text>}
        </View>
        <TouchableOpacity onPress={refresh} style={[styles.iconBtn, { backgroundColor: colors.muted }]} activeOpacity={0.7}>
          {loading ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="refresh-outline" size={15} color={colors.mutedForeground} />}
        </TouchableOpacity>
      </View>

      {/* Agent selector */}
      {agents.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.agentRow}>
          {agents.map((a) => {
            const active = selectedAgent === a.id;
            return (
              <TouchableOpacity
                key={a.id}
                onPress={() => setSelectedAgent(a.id)}
                style={[styles.agentChip, { backgroundColor: active ? colors.primary + "20" : colors.muted, borderColor: active ? colors.primary + "50" : colors.border }]}
                activeOpacity={0.7}
              >
                <Text style={[styles.agentChipText, { color: active ? colors.primary : colors.mutedForeground }]}>
                  {a.display_name ?? a.agent_key}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Metrics bar chart */}
      {toolAggs.length > 0 && (
        <View style={[styles.chartBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.chartTitle, { color: colors.mutedForeground }]}>TOOL USAGE</Text>
          {(() => {
            const maxCalls = Math.max(...toolAggs.map((t) => t.call_count), 1);
            return toolAggs.slice(0, 6).map((t) => {
              const pct = t.call_count / maxCalls;
              const successPct = t.call_count > 0 ? (t.call_count - t.failure_count) / t.call_count : 1;
              return (
                <View key={t.tool_name} style={styles.chartRow}>
                  <Text style={[styles.chartLabel, { color: colors.foreground }]} numberOfLines={1}>{t.tool_name}</Text>
                  <View style={styles.chartBarArea}>
                    <View style={[styles.chartBarTrack, { backgroundColor: colors.secondary }]}>
                      <View style={[styles.chartBarFill, { width: `${pct * 100}%`, backgroundColor: t.failure_count > 0 ? "#f97316" : "#22c55e" }]} />
                    </View>
                    <Text style={[styles.chartCount, { color: colors.mutedForeground }]}>{t.call_count}</Text>
                    {t.failure_count > 0 && (
                      <Text style={[styles.chartFail, { color: "#ef4444" }]}>-{t.failure_count}</Text>
                    )}
                  </View>
                </View>
              );
            });
          })()}
        </View>
      )}

      {/* Status filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {STATUS_FILTERS.map((s) => {
          const active = statusFilter === s;
          const sColor = STATUS_COLORS[s] ?? colors.primary;
          return (
            <TouchableOpacity
              key={s}
              onPress={() => setStatusFilter(s)}
              style={[styles.filterChip, { backgroundColor: active ? sColor + "20" : colors.muted, borderColor: active ? sColor + "40" : colors.border }]}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterText, { color: active ? sColor : colors.mutedForeground }]}>{s}</Text>
              {active && suggestions.length > 0 && (
                <View style={[styles.countBadge, { backgroundColor: sColor }]}>
                  <Text style={styles.countText}>{suggestions.length}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {!selectedAgent ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="planet-outline" size={40} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Chọn agent để xem đề xuất evolution</Text>
        </View>
      ) : error ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="alert-circle-outline" size={36} color={colors.destructive} />
          <Text style={[styles.emptyText, { color: colors.destructive }]}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={suggestions}
          keyExtractor={(s) => s.id}
          renderItem={({ item }) => (
            <SuggestionCard
              item={item}
              updating={updating === item.id}
              onApprove={() => handleUpdate(item.id, "approved")}
              onReject={() => handleUpdate(item.id, "rejected")}
              colors={colors}
            />
          )}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            loading ? (
              <View style={styles.emptyWrap}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : (
              <View style={styles.emptyWrap}>
                <Ionicons name="bulb-outline" size={36} color={colors.mutedForeground} />
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Không có đề xuất nào</Text>
              </View>
            )
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingBottom: 6, gap: 8 },
  backBtn: { padding: 4 },
  titleArea: { flex: 1, flexDirection: "row", alignItems: "baseline", gap: 8 },
  title: { fontSize: 20, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  agentTag: { fontSize: 12, fontFamily: "Inter_500Medium" },
  iconBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  agentRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 5, gap: 7 },
  agentChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  agentChipText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  chartBox: { marginHorizontal: 14, marginBottom: 8, borderRadius: 14, borderWidth: 1, padding: 12, gap: 8 },
  chartTitle: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  chartRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  chartLabel: { width: 100, fontSize: 11, fontFamily: "Inter_500Medium" },
  chartBarArea: { flex: 1, flexDirection: "row", alignItems: "center", gap: 6 },
  chartBarTrack: { flex: 1, height: 8, borderRadius: 4, overflow: "hidden" },
  chartBarFill: { height: 8, borderRadius: 4 },
  chartCount: { fontSize: 10, fontFamily: "Inter_700Bold", minWidth: 22, textAlign: "right" },
  chartFail: { fontSize: 10, fontFamily: "Inter_700Bold" },
  filterRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 5, gap: 7 },
  filterChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1, alignSelf: "flex-start" },
  filterText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  countBadge: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: 8, minWidth: 16, alignItems: "center" },
  countText: { fontSize: 9, fontFamily: "Inter_700Bold", color: "#fff" },
  list: { padding: 14, gap: 10 },
  card: { borderRadius: 16, borderWidth: 1, padding: 14, gap: 10 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  typeIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  cardMeta: { flex: 1, gap: 3 },
  cardType: { fontSize: 11, fontFamily: "Inter_500Medium", textTransform: "capitalize" },
  statusBadge: { alignSelf: "flex-start", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  statusText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  cardTime: { fontSize: 11, fontFamily: "Inter_400Regular" },
  cardTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  cardContent: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  rationaleBox: { borderRadius: 10, padding: 10, gap: 3 },
  rationaleLabel: { fontSize: 10, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 0.5 },
  rationaleText: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  actions: { flexDirection: "row", gap: 8 },
  rejectBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, borderRadius: 12, borderWidth: 1, paddingVertical: 9 },
  rejectText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#ef4444" },
  approveBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, borderRadius: 12, borderWidth: 1, paddingVertical: 9 },
  approveText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#22c55e" },
  reviewedBy: { fontSize: 10, fontFamily: "Inter_400Regular" },
  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60, gap: 10 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", paddingHorizontal: 30 },
});
