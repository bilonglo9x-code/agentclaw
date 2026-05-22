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
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useMemory, MemoryDocument, EpisodicSummary } from "@/hooks/useMemory";
import { useAgents } from "@/hooks/useAgents";
import { useAuth } from "@/context/AuthContext";

type Tab = "documents" | "episodic";

const MOCK_DOCS: MemoryDocument[] = [
  { path: "user_preferences.md", hash: "abc123", agent_id: "assistant", updated_at: Date.now() - 3600000 },
  { path: "project_context.md", hash: "def456", agent_id: "assistant", updated_at: Date.now() - 86400000 },
  { path: "coding_style.md", hash: "ghi789", agent_id: "code-expert", updated_at: Date.now() - 86400000 * 2 },
  { path: "research_notes.md", hash: "jkl012", agent_id: "researcher", updated_at: Date.now() - 86400000 * 3 },
  { path: "meeting_summary_2025.md", hash: "mno345", agent_id: "assistant", updated_at: Date.now() - 86400000 * 5 },
];

const MOCK_EPISODIC: EpisodicSummary[] = [
  { id: "ep1", agent_id: "assistant", user_id: "u1", session_key: "sess_abc", summary: "Người dùng yêu cầu phân tích dữ liệu bán hàng Q4 và tạo báo cáo tổng kết", key_topics: ["sales", "Q4", "report"], l0_abstract: "Sales analysis session", source_type: "session", turn_count: 12, token_count: 4200, created_at: new Date(Date.now() - 3600000).toISOString(), expires_at: null },
  { id: "ep2", agent_id: "code-expert", user_id: "u1", session_key: "sess_xyz", summary: "Debug lỗi async trong handler Express, tìm ra nguyên nhân là thiếu await trong middleware", key_topics: ["express", "async", "debug"], l0_abstract: "Express debug session", source_type: "session", turn_count: 8, token_count: 2800, created_at: new Date(Date.now() - 86400000).toISOString(), expires_at: null },
  { id: "ep3", agent_id: "researcher", user_id: "u1", session_key: "sess_def", summary: "Nghiên cứu về Large Language Models và các ứng dụng trong enterprise", key_topics: ["LLM", "enterprise", "AI"], l0_abstract: "LLM research session", source_type: "v2_daily", turn_count: 25, token_count: 8500, created_at: new Date(Date.now() - 86400000 * 2).toISOString(), expires_at: null },
];

function fmtTime(ts: number | string): string {
  const d = new Date(typeof ts === "number" ? ts : ts);
  const diff = Date.now() - d.getTime();
  if (diff < 60000) return "Vừa xong";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m trước`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h trước`;
  return `${Math.floor(diff / 86400000)}d trước`;
}

export default function MemoryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { connected } = useAuth();
  const { agents } = useAgents();
  const [selectedAgent, setSelectedAgent] = useState<string | undefined>(undefined);
  const [tab, setTab] = useState<Tab>("documents");
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { documents: liveDocs, episodic: liveEpisodic, loading, error, refresh, deleteDocument } = useMemory(selectedAgent);

  const documents = connected && liveDocs.length > 0 ? liveDocs : MOCK_DOCS;
  const episodic = connected && liveEpisodic.length > 0 ? liveEpisodic : MOCK_EPISODIC;

  const handleDelete = (path: string) => {
    Alert.alert("Xóa tài liệu", `Xóa "${path}" khỏi memory?`, [
      { text: "Hủy", style: "cancel" },
      { text: "Xóa", style: "destructive", onPress: () => deleteDocument(path) },
    ]);
  };

  const agentOptions = [
    { id: undefined, label: "Tất cả" },
    ...agents.map((a) => ({ id: a.id, label: a.display_name ?? a.id })),
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 4 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>Memory</Text>
        <TouchableOpacity onPress={refresh} style={[styles.iconBtn, { backgroundColor: colors.muted }]} activeOpacity={0.7}>
          {loading ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="refresh-outline" size={15} color={colors.mutedForeground} />}
        </TouchableOpacity>
      </View>

      {/* Agent filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.agentChips}>
        {agentOptions.map((opt) => {
          const active = selectedAgent === opt.id;
          return (
            <TouchableOpacity
              key={opt.id ?? "all"}
              onPress={() => setSelectedAgent(opt.id)}
              style={[styles.chip, { backgroundColor: active ? colors.primary + "25" : colors.muted, borderColor: active ? colors.primary + "60" : colors.border }]}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, { color: active ? colors.primary : colors.mutedForeground }]}>{opt.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Tabs */}
      <View style={[styles.tabRow, { borderBottomColor: colors.border }]}>
        {(["documents", "episodic"] as Tab[]).map((t) => (
          <TouchableOpacity
            key={t}
            onPress={() => setTab(t)}
            style={[styles.tab, tab === t && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, { color: tab === t ? colors.primary : colors.mutedForeground }]}>
              {t === "documents" ? `Documents (${documents.length})` : `Episodic (${episodic.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {error && (
        <View style={[styles.errorBanner, { backgroundColor: colors.destructive + "15" }]}>
          <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
        </View>
      )}

      {tab === "documents" && (
        <FlatList
          data={documents}
          keyExtractor={(d) => d.path}
          renderItem={({ item }) => (
            <View style={[styles.docCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.docIcon, { backgroundColor: colors.primary + "18" }]}>
                <Ionicons name="document-text-outline" size={18} color={colors.primary} />
              </View>
              <View style={styles.docInfo}>
                <Text style={[styles.docPath, { color: colors.foreground }]} numberOfLines={1}>{item.path}</Text>
                <View style={styles.docMeta}>
                  {item.agent_id && (
                    <Text style={[styles.metaText, { color: colors.primary }]}>{item.agent_id}</Text>
                  )}
                  <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{fmtTime(item.updated_at * 1000)}</Text>
                </View>
              </View>
              {selectedAgent && (
                <TouchableOpacity onPress={() => handleDelete(item.path)} activeOpacity={0.7} style={styles.deleteBtn}>
                  <Ionicons name="trash-outline" size={16} color={colors.destructive} />
                </TouchableOpacity>
              )}
            </View>
          )}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 40 }]}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="library-outline" size={36} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Không có memory documents</Text>
            </View>
          }
        />
      )}

      {tab === "episodic" && (
        <FlatList
          data={episodic}
          keyExtractor={(e) => e.id}
          renderItem={({ item }) => (
            <View style={[styles.episodicCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.episodicTop}>
                <View style={[styles.sourceTag, {
                  backgroundColor: item.source_type === "v2_daily" ? "#60a5fa20" : "#22c55e20",
                }]}>
                  <Text style={[styles.sourceTagText, {
                    color: item.source_type === "v2_daily" ? "#60a5fa" : "#22c55e",
                  }]}>
                    {item.source_type === "v2_daily" ? "Daily" : "Session"}
                  </Text>
                </View>
                <Text style={[styles.episodicTime, { color: colors.mutedForeground }]}>{fmtTime(item.created_at)}</Text>
              </View>
              <Text style={[styles.episodicSummary, { color: colors.foreground }]} numberOfLines={3}>{item.summary}</Text>
              <View style={styles.episodicTopics}>
                {item.key_topics.slice(0, 4).map((topic) => (
                  <View key={topic} style={[styles.topicBadge, { backgroundColor: colors.muted }]}>
                    <Text style={[styles.topicText, { color: colors.mutedForeground }]}>{topic}</Text>
                  </View>
                ))}
              </View>
              <View style={[styles.episodicStats, { borderTopColor: colors.border }]}>
                <View style={styles.statPair}>
                  <Ionicons name="chatbubbles-outline" size={11} color={colors.mutedForeground} />
                  <Text style={[styles.statText, { color: colors.mutedForeground }]}>{item.turn_count} turns</Text>
                </View>
                <View style={styles.statPair}>
                  <Ionicons name="code-outline" size={11} color={colors.mutedForeground} />
                  <Text style={[styles.statText, { color: colors.mutedForeground }]}>{(item.token_count / 1000).toFixed(1)}K tokens</Text>
                </View>
                <Text style={[styles.agentBadge, { color: colors.primary }]}>{item.agent_id}</Text>
              </View>
            </View>
          )}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 40 }]}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="book-outline" size={36} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Không có episodic memory</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingBottom: 8, gap: 8 },
  backBtn: { padding: 4 },
  title: { flex: 1, fontSize: 20, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  iconBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  agentChips: { paddingHorizontal: 14, paddingVertical: 6, gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  tabRow: { flexDirection: "row", borderBottomWidth: StyleSheet.hairlineWidth, marginHorizontal: 16 },
  tab: { flex: 1, alignItems: "center", paddingVertical: 10 },
  tabText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  errorBanner: { marginHorizontal: 16, marginVertical: 6, borderRadius: 10, padding: 10 },
  errorText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  list: { paddingHorizontal: 14, paddingTop: 10 },
  docCard: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 16, borderWidth: 1, padding: 12 },
  docIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  docInfo: { flex: 1 },
  docPath: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  docMeta: { flexDirection: "row", gap: 8, marginTop: 3 },
  metaText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  deleteBtn: { padding: 6 },
  episodicCard: { borderRadius: 18, borderWidth: 1, padding: 14, gap: 10 },
  episodicTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sourceTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  sourceTagText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  episodicTime: { fontSize: 11, fontFamily: "Inter_400Regular" },
  episodicSummary: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  episodicTopics: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  topicBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  topicText: { fontSize: 10, fontFamily: "Inter_400Regular" },
  episodicStats: { flexDirection: "row", alignItems: "center", gap: 12, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth },
  statPair: { flexDirection: "row", alignItems: "center", gap: 4 },
  statText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  agentBadge: { marginLeft: "auto", fontSize: 11, fontFamily: "Inter_600SemiBold" },
  emptyWrap: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
});
