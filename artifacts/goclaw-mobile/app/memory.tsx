import React, { useMemo, useState } from "react";
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

const AGENT_COLORS: Record<string, string> = {
  assistant: "#f97316",
  "code-expert": "#60a5fa",
  researcher: "#a78bfa",
};

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

  const agentDocCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    MOCK_DOCS.forEach((d) => {
      if (d.agent_id) counts[d.agent_id] = (counts[d.agent_id] ?? 0) + 1;
    });
    return counts;
  }, []);

  const totalTokens = episodic.reduce((s, e) => s + (e.token_count ?? 0), 0);
  const maxTokens = Math.max(...episodic.map((e) => e.token_count ?? 0), 1);

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

      {/* Summary stats */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.statCount, { color: colors.primary }]}>{documents.length}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Documents</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.statCount, { color: "#a78bfa" }]}>{episodic.length}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Episodic</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.statCount, { color: "#22c55e" }]}>{(totalTokens / 1000).toFixed(1)}K</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Tokens</Text>
        </View>
      </View>

      {/* Agent distribution */}
      {Object.keys(agentDocCounts).length > 0 && (
        <View style={[styles.agentDistBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.distLabel, { color: colors.mutedForeground }]}>DOCS THEO AGENT</Text>
          <View style={styles.distTrack}>
            {Object.entries(agentDocCounts).map(([agentId, count]) => {
              const pct = (count / documents.length) * 100;
              const c = AGENT_COLORS[agentId] ?? colors.primary;
              return <View key={agentId} style={[styles.distSeg, { width: `${pct}%`, backgroundColor: c }]} />;
            })}
          </View>
          <View style={styles.distLegend}>
            {Object.entries(agentDocCounts).map(([agentId, count]) => {
              const c = AGENT_COLORS[agentId] ?? colors.primary;
              return (
                <View key={agentId} style={styles.distItem}>
                  <View style={[styles.distDot, { backgroundColor: c }]} />
                  <Text style={[styles.distText, { color: colors.mutedForeground }]}>{agentId} ({count})</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Agent filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.agentChips}>
        {agentOptions.map((opt) => {
          const active = selectedAgent === opt.id;
          const agentColor = opt.id ? (AGENT_COLORS[opt.id] ?? colors.primary) : colors.primary;
          return (
            <TouchableOpacity
              key={opt.id ?? "all"}
              onPress={() => setSelectedAgent(opt.id)}
              style={[styles.chip, { backgroundColor: active ? agentColor + "25" : colors.muted, borderColor: active ? agentColor + "60" : colors.border }]}
              activeOpacity={0.7}
            >
              {opt.id && <View style={[styles.agentDot, { backgroundColor: AGENT_COLORS[opt.id] ?? colors.primary }]} />}
              <Text style={[styles.chipText, { color: active ? agentColor : colors.mutedForeground }]}>{opt.label}</Text>
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
          renderItem={({ item }) => {
            const agentColor = item.agent_id ? (AGENT_COLORS[item.agent_id] ?? colors.primary) : colors.primary;
            return (
              <View style={[styles.docCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.docIcon, { backgroundColor: agentColor + "18" }]}>
                  <Ionicons name="document-text-outline" size={18} color={agentColor} />
                </View>
                <View style={styles.docInfo}>
                  <Text style={[styles.docPath, { color: colors.foreground }]} numberOfLines={1}>{item.path}</Text>
                  <View style={styles.docMeta}>
                    {item.agent_id && (
                      <View style={[styles.agentBadge, { backgroundColor: agentColor + "18" }]}>
                        <View style={[styles.agentDot, { backgroundColor: agentColor }]} />
                        <Text style={[styles.agentBadgeText, { color: agentColor }]}>{item.agent_id}</Text>
                      </View>
                    )}
                    <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{fmtTime(item.updated_at * 1000)}</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => handleDelete(item.path)} activeOpacity={0.7} style={styles.deleteBtn}>
                  <Ionicons name="trash-outline" size={16} color={colors.destructive} />
                </TouchableOpacity>
              </View>
            );
          }}
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
          renderItem={({ item }) => {
            const agentColor = AGENT_COLORS[item.agent_id] ?? colors.primary;
            const tokenPct = (item.token_count ?? 0) / maxTokens;
            return (
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
                  <View style={[styles.agentBadge, { backgroundColor: agentColor + "18" }]}>
                    <View style={[styles.agentDot, { backgroundColor: agentColor }]} />
                    <Text style={[styles.agentBadgeText, { color: agentColor }]}>{item.agent_id}</Text>
                  </View>
                  <Text style={[styles.episodicTime, { color: colors.mutedForeground }]}>{fmtTime(item.created_at)}</Text>
                </View>
                <Text style={[styles.episodicSummary, { color: colors.foreground }]} numberOfLines={3}>{item.summary}</Text>

                {/* Token usage bar */}
                <View style={styles.tokenRow}>
                  <View style={[styles.tokenTrack, { backgroundColor: colors.secondary }]}>
                    <View style={[styles.tokenFill, { width: `${tokenPct * 100}%`, backgroundColor: agentColor }]} />
                  </View>
                  <Text style={[styles.tokenCount, { color: colors.mutedForeground }]}>{(item.token_count / 1000).toFixed(1)}K tok</Text>
                </View>

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
                </View>
              </View>
            );
          }}
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
  statsRow: { flexDirection: "row", gap: 10, paddingHorizontal: 16, marginBottom: 8 },
  statCard: { flex: 1, borderRadius: 14, borderWidth: 1, padding: 12, alignItems: "center" },
  statCount: { fontSize: 18, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 10, fontFamily: "Inter_500Medium", marginTop: 2 },
  agentDistBar: { marginHorizontal: 16, marginBottom: 8, borderRadius: 14, borderWidth: 1, padding: 12, gap: 8 },
  distLabel: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  distTrack: { flexDirection: "row", height: 8, borderRadius: 4, overflow: "hidden", gap: 1 },
  distSeg: { height: 8 },
  distLegend: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  distItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  distDot: { width: 6, height: 6, borderRadius: 3 },
  distText: { fontSize: 10, fontFamily: "Inter_400Regular" },
  agentChips: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 6, gap: 8 },
  chip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  agentDot: { width: 6, height: 6, borderRadius: 3 },
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
  docMeta: { flexDirection: "row", gap: 8, marginTop: 4, alignItems: "center" },
  agentBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 7 },
  agentBadgeText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  metaText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  deleteBtn: { padding: 6 },
  episodicCard: { borderRadius: 18, borderWidth: 1, padding: 14, gap: 10 },
  episodicTop: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  sourceTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  sourceTagText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  episodicTime: { fontSize: 11, fontFamily: "Inter_400Regular", marginLeft: "auto" },
  episodicSummary: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  tokenRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  tokenTrack: { flex: 1, height: 5, borderRadius: 3, overflow: "hidden" },
  tokenFill: { height: 5, borderRadius: 3 },
  tokenCount: { fontSize: 10, fontFamily: "Inter_500Medium", minWidth: 52, textAlign: "right" },
  episodicTopics: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  topicBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  topicText: { fontSize: 10, fontFamily: "Inter_400Regular" },
  episodicStats: { flexDirection: "row", alignItems: "center", gap: 12, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth },
  statPair: { flexDirection: "row", alignItems: "center", gap: 4 },
  statText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  emptyWrap: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
});
