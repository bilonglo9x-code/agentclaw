import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useTeams, TeamData, TeamTask, TaskStatus } from "@/hooks/useTeams";
import { useAuth } from "@/context/AuthContext";

const TASK_STATUS_CONFIG: Record<TaskStatus, { color: string; label: string; icon: keyof typeof Ionicons["glyphMap"] }> = {
  pending: { color: "#a1a1aa", label: "Pending", icon: "time-outline" },
  in_progress: { color: "#60a5fa", label: "In Progress", icon: "play-outline" },
  in_review: { color: "#f59e0b", label: "In Review", icon: "eye-outline" },
  completed: { color: "#22c55e", label: "Completed", icon: "checkmark-circle-outline" },
  blocked: { color: "#f97316", label: "Blocked", icon: "ban-outline" },
  failed: { color: "#ef4444", label: "Failed", icon: "close-circle-outline" },
  cancelled: { color: "#71717a", label: "Cancelled", icon: "remove-circle-outline" },
};

const MOCK_TEAMS: TeamData[] = [
  { id: "t1", name: "Customer Support", lead_agent_id: "support-lead", lead_display_name: "Support Lead", description: "Team xử lý yêu cầu khách hàng", status: "active", member_count: 4 },
  { id: "t2", name: "Research & Analysis", lead_agent_id: "researcher", lead_display_name: "Researcher", description: "Team nghiên cứu và phân tích dữ liệu", status: "active", member_count: 3 },
  { id: "t3", name: "Content Creation", lead_agent_id: "writer", lead_display_name: "Writer", description: "Team tạo nội dung và marketing", status: "active", member_count: 2 },
];

const MOCK_TASKS: Record<string, TeamTask[]> = {
  t1: [
    { id: "tk1", team_id: "t1", subject: "Phân tích yêu cầu khách hàng Q1", status: "completed", owner_agent_key: "support-lead" },
    { id: "tk2", team_id: "t1", subject: "Xử lý ticket #4521 — lỗi thanh toán", status: "in_progress", owner_agent_key: "support-agent-1" },
    { id: "tk3", team_id: "t1", subject: "Cập nhật FAQ tháng 5", status: "pending" },
  ],
  t2: [
    { id: "tk4", team_id: "t2", subject: "Báo cáo thị trường AI 2025", status: "in_review", owner_agent_key: "researcher" },
    { id: "tk5", team_id: "t2", subject: "Phân tích cạnh tranh startup edtech", status: "in_progress", owner_agent_key: "analyst" },
  ],
  t3: [
    { id: "tk6", team_id: "t3", subject: "Viết blog về LLM trong enterprise", status: "completed", owner_agent_key: "writer" },
    { id: "tk7", team_id: "t3", subject: "Script podcast tập 12", status: "blocked", owner_agent_key: "writer", description: "Chờ approval từ legal team" },
  ],
};

function fmtDate(iso?: string): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  return `${Math.floor(diff / 86400000)}d`;
}

export default function TeamsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { connected } = useAuth();
  const { teams: liveTeams, loading, error, refresh, loadTasks } = useTeams();
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);
  const [taskMap, setTaskMap] = useState<Record<string, TeamTask[]>>({});
  const [loadingTasks, setLoadingTasks] = useState<string | null>(null);
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const teams = connected && liveTeams.length > 0 ? liveTeams : MOCK_TEAMS;

  const handleExpandTeam = async (teamId: string) => {
    if (expandedTeam === teamId) {
      setExpandedTeam(null);
      return;
    }
    setExpandedTeam(teamId);
    if (!taskMap[teamId]) {
      if (!connected) {
        setTaskMap((prev) => ({ ...prev, [teamId]: MOCK_TASKS[teamId] ?? [] }));
        return;
      }
      setLoadingTasks(teamId);
      try {
        const tasks = await loadTasks(teamId);
        setTaskMap((prev) => ({ ...prev, [teamId]: tasks }));
      } finally {
        setLoadingTasks(null);
      }
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 4 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>Teams</Text>
        <TouchableOpacity onPress={refresh} style={[styles.iconBtn, { backgroundColor: colors.muted }]} activeOpacity={0.7}>
          {loading ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="refresh-outline" size={15} color={colors.mutedForeground} />}
        </TouchableOpacity>
      </View>

      {/* Summary */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sumCount, { color: colors.primary }]}>{teams.length}</Text>
          <Text style={[styles.sumLabel, { color: colors.mutedForeground }]}>Teams</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sumCount, { color: "#22c55e" }]}>{teams.filter((t) => t.status === "active").length}</Text>
          <Text style={[styles.sumLabel, { color: colors.mutedForeground }]}>Active</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sumCount, { color: colors.foreground }]}>{teams.reduce((s, t) => s + (t.member_count ?? 0), 0)}</Text>
          <Text style={[styles.sumLabel, { color: colors.mutedForeground }]}>Agents</Text>
        </View>
      </View>

      {error && (
        <View style={[styles.errorBanner, { backgroundColor: colors.destructive + "15" }]}>
          <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
        </View>
      )}

      <FlatList
        data={teams}
        keyExtractor={(t) => t.id}
        renderItem={({ item }) => {
          const expanded = expandedTeam === item.id;
          const tasks = taskMap[item.id] ?? [];
          const isLoadingTasks = loadingTasks === item.id;

          const taskCounts = tasks.reduce<Record<string, number>>((acc, t) => {
            acc[t.status] = (acc[t.status] ?? 0) + 1;
            return acc;
          }, {});

          return (
            <View style={[styles.teamCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <TouchableOpacity onPress={() => handleExpandTeam(item.id)} activeOpacity={0.7}>
                <View style={styles.teamHeader}>
                  <View style={[styles.teamIcon, { backgroundColor: colors.primary + "20" }]}>
                    <Ionicons name="people-outline" size={20} color={colors.primary} />
                  </View>
                  <View style={styles.teamInfo}>
                    <Text style={[styles.teamName, { color: colors.foreground }]}>{item.name}</Text>
                    {item.description && (
                      <Text style={[styles.teamDesc, { color: colors.mutedForeground }]} numberOfLines={1}>{item.description}</Text>
                    )}
                    <View style={styles.teamMeta}>
                      {item.lead_display_name && (
                        <View style={styles.leadRow}>
                          <Ionicons name="star-outline" size={11} color={colors.primary} />
                          <Text style={[styles.leadName, { color: colors.primary }]}>{item.lead_display_name}</Text>
                        </View>
                      )}
                      {item.member_count != null && (
                        <Text style={[styles.memberCount, { color: colors.mutedForeground }]}>
                          {item.member_count} agents
                        </Text>
                      )}
                    </View>
                  </View>
                  <View style={styles.teamRight}>
                    <View style={[styles.statusDot, { backgroundColor: item.status === "active" ? "#22c55e" : "#71717a" }]} />
                    <Ionicons
                      name={expanded ? "chevron-up" : "chevron-down"}
                      size={16}
                      color={colors.mutedForeground}
                    />
                  </View>
                </View>
              </TouchableOpacity>

              {expanded && (
                <View style={[styles.tasksSection, { borderTopColor: colors.border }]}>
                  {isLoadingTasks ? (
                    <ActivityIndicator size="small" color={colors.primary} style={{ padding: 16 }} />
                  ) : tasks.length === 0 ? (
                    <Text style={[styles.noTasks, { color: colors.mutedForeground }]}>Không có tasks</Text>
                  ) : (
                    <>
                      {/* Task status summary */}
                      <View style={styles.taskSummary}>
                        {Object.entries(taskCounts).map(([status, count]) => {
                          const cfg = TASK_STATUS_CONFIG[status as TaskStatus];
                          return cfg ? (
                            <View key={status} style={styles.taskStatusChip}>
                              <View style={[styles.miniDot, { backgroundColor: cfg.color }]} />
                              <Text style={[styles.taskStatusCount, { color: cfg.color }]}>{count}</Text>
                            </View>
                          ) : null;
                        })}
                      </View>
                      {tasks.map((task) => {
                        const cfg = TASK_STATUS_CONFIG[task.status] ?? TASK_STATUS_CONFIG.pending;
                        return (
                          <View key={task.id} style={[styles.taskRow, { borderBottomColor: colors.border }]}>
                            <Ionicons name={cfg.icon} size={14} color={cfg.color} />
                            <View style={styles.taskInfo}>
                              <Text style={[styles.taskSubject, { color: colors.foreground }]} numberOfLines={1}>{task.subject}</Text>
                              {task.description && (
                                <Text style={[styles.taskDesc, { color: colors.mutedForeground }]} numberOfLines={1}>{task.description}</Text>
                              )}
                            </View>
                            {task.owner_agent_key && (
                              <Text style={[styles.taskOwner, { color: colors.mutedForeground }]} numberOfLines={1}>{task.owner_agent_key}</Text>
                            )}
                          </View>
                        );
                      })}
                    </>
                  )}
                </View>
              )}
            </View>
          );
        }}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 40 }]}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="people-outline" size={36} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Không có teams</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingBottom: 10, gap: 8 },
  backBtn: { padding: 4 },
  title: { flex: 1, fontSize: 20, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  iconBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  summaryRow: { flexDirection: "row", gap: 10, paddingHorizontal: 16, marginBottom: 12 },
  summaryCard: { flex: 1, borderRadius: 14, borderWidth: 1, padding: 12, alignItems: "center" },
  sumCount: { fontSize: 20, fontFamily: "Inter_700Bold" },
  sumLabel: { fontSize: 11, fontFamily: "Inter_500Medium", marginTop: 2 },
  errorBanner: { marginHorizontal: 16, marginBottom: 8, borderRadius: 10, padding: 10 },
  errorText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  list: { paddingHorizontal: 14, paddingTop: 4 },
  teamCard: { borderRadius: 18, borderWidth: 1, overflow: "hidden" },
  teamHeader: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  teamIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  teamInfo: { flex: 1 },
  teamName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  teamDesc: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  teamMeta: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 },
  leadRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  leadName: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  memberCount: { fontSize: 11, fontFamily: "Inter_400Regular" },
  teamRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  tasksSection: { borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14, paddingBottom: 10 },
  taskSummary: { flexDirection: "row", gap: 8, paddingVertical: 8 },
  taskStatusChip: { flexDirection: "row", alignItems: "center", gap: 4 },
  miniDot: { width: 6, height: 6, borderRadius: 3 },
  taskStatusCount: { fontSize: 12, fontFamily: "Inter_700Bold" },
  taskRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth },
  taskInfo: { flex: 1 },
  taskSubject: { fontSize: 13, fontFamily: "Inter_400Regular" },
  taskDesc: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  taskOwner: { fontSize: 10, fontFamily: "Inter_400Regular", maxWidth: 80 },
  noTasks: { padding: 14, fontSize: 13, fontFamily: "Inter_400Regular" },
  emptyWrap: { alignItems: "center", paddingTop: 80, gap: 10 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
});
