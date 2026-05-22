import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
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
import { useAuth } from "@/context/AuthContext";
import { useSkills, SkillInfo } from "@/hooks/useSkills";
import { SearchBar } from "@/components/SearchBar";

const LANG_COLORS: Record<string, string> = {
  python: "#3b82f6",
  javascript: "#f59e0b",
  typescript: "#60a5fa",
  go: "#22d3ee",
  shell: "#22c55e",
  bash: "#22c55e",
};

const MOCK_SKILLS: SkillInfo[] = [
  { id: "s1", slug: "data_query", name: "Data Query", description: "Query databases and data sources", version: 3, status: "active", language: "python", tags: ["database", "sql"] },
  { id: "s2", slug: "web_search", name: "Web Search", description: "Search the web using SerpAPI", version: 1, status: "active", language: "python", tags: ["search", "web"] },
  { id: "s3", slug: "code_exec", name: "Code Executor", description: "Execute Python code in a sandboxed environment", version: 2, status: "active", language: "python", tags: ["code", "execution"] },
  { id: "s4", slug: "email_send", name: "Email Sender", description: "Send emails via SMTP or SendGrid", version: 1, status: "active", language: "javascript", tags: ["email", "communication"] },
  { id: "s5", slug: "file_ops", name: "File Operations", description: "Read and write files in the workspace", version: 4, status: "active", language: "go", tags: ["files", "storage"] },
  { id: "s6", slug: "slack_notify", name: "Slack Notify", description: "Send notifications to Slack channels", version: 1, status: "inactive", language: "typescript", tags: ["slack", "notifications"] },
  { id: "s7", slug: "pdf_extract", name: "PDF Extractor", description: "Extract text and data from PDF files", version: 2, status: "active", language: "python", tags: ["pdf", "documents"], has_deps_issues: true },
];

const STATUS_CONFIG = {
  active: { color: "#22c55e", label: "Active" },
  inactive: { color: "#a1a1aa", label: "Inactive" },
  archived: { color: "#71717a", label: "Archived" },
};

export default function SkillsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { connected } = useAuth();
  const { skills: liveSkills, loading, error, refresh } = useSkills();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const rawSkills = connected && liveSkills.length > 0 ? liveSkills : MOCK_SKILLS;

  const filtered = useMemo(() => {
    return rawSkills.filter((s) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        (s.description ?? "").toLowerCase().includes(q) ||
        s.slug.toLowerCase().includes(q) ||
        (s.tags ?? []).some((t) => t.toLowerCase().includes(q));
      const matchStatus = statusFilter === "all" || s.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [rawSkills, search, statusFilter]);

  const activeCount = rawSkills.filter((s) => s.status === "active").length;
  const depsIssues = rawSkills.filter((s) => s.has_deps_issues).length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 4 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>Skills</Text>
        <View style={styles.headerRight}>
          {loading && <ActivityIndicator size="small" color={colors.primary} />}
          <TouchableOpacity onPress={refresh} style={[styles.iconBtn, { backgroundColor: colors.muted }]} activeOpacity={0.7}>
            <Ionicons name="refresh-outline" size={15} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Summary */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.summaryCount, { color: "#22c55e" }]}>{activeCount}</Text>
          <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Active</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.summaryCount, { color: colors.foreground }]}>{rawSkills.length}</Text>
          <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Total</Text>
        </View>
        {depsIssues > 0 && (
          <View style={[styles.summaryCard, { backgroundColor: "#f59e0b15", borderColor: "#f59e0b40" }]}>
            <Text style={[styles.summaryCount, { color: "#f59e0b" }]}>{depsIssues}</Text>
            <Text style={[styles.summaryLabel, { color: "#f59e0b" }]}>Deps ⚠</Text>
          </View>
        )}
      </View>

      <View style={styles.searchWrap}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Tìm skill..." />
      </View>

      {/* Status filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {(["all", "active", "inactive"] as const).map((s) => {
          const active = statusFilter === s;
          const cfg = s !== "all" ? STATUS_CONFIG[s] : null;
          return (
            <TouchableOpacity
              key={s}
              onPress={() => setStatusFilter(s)}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? (cfg?.color ?? colors.primary) + "20" : colors.muted,
                  borderColor: active ? (cfg?.color ?? colors.primary) + "60" : colors.border,
                },
              ]}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, { color: active ? (cfg?.color ?? colors.primary) : colors.mutedForeground }]}>
                {s === "all" ? "Tất cả" : cfg?.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {error && (
        <View style={[styles.errorBanner, { backgroundColor: colors.destructive + "15" }]}>
          <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
        </View>
      )}

      <FlatList
        data={filtered}
        keyExtractor={(s) => s.id}
        renderItem={({ item }) => {
          const stCfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.active;
          const langColor = LANG_COLORS[item.language?.toLowerCase() ?? ""] ?? colors.primary;
          return (
            <TouchableOpacity
              style={[styles.skillCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              activeOpacity={0.8}
            >
              <View style={styles.skillTop}>
                <View style={[styles.skillIcon, { backgroundColor: langColor + "20" }]}>
                  <Ionicons name="flash-outline" size={18} color={langColor} />
                </View>
                <View style={styles.skillInfo}>
                  <View style={styles.skillNameRow}>
                    <Text style={[styles.skillName, { color: colors.foreground }]}>{item.name}</Text>
                    {item.has_deps_issues && (
                      <Ionicons name="warning-outline" size={14} color="#f59e0b" />
                    )}
                  </View>
                  <Text style={[styles.skillSlug, { color: colors.mutedForeground }]}>{item.slug}</Text>
                </View>
                <View style={styles.skillRight}>
                  <View style={[styles.statusDot, { backgroundColor: stCfg.color }]} />
                  {item.version != null && (
                    <Text style={[styles.versionText, { color: colors.mutedForeground }]}>v{item.version}</Text>
                  )}
                </View>
              </View>

              {item.description && (
                <Text style={[styles.skillDesc, { color: colors.mutedForeground }]} numberOfLines={2}>
                  {item.description}
                </Text>
              )}

              <View style={styles.skillFooter}>
                {item.language && (
                  <View style={[styles.langBadge, { backgroundColor: langColor + "18" }]}>
                    <Text style={[styles.langText, { color: langColor }]}>{item.language}</Text>
                  </View>
                )}
                {(item.tags ?? []).slice(0, 2).map((tag) => (
                  <View key={tag} style={[styles.tagBadge, { backgroundColor: colors.muted }]}>
                    <Text style={[styles.tagText, { color: colors.mutedForeground }]}>{tag}</Text>
                  </View>
                ))}
              </View>
            </TouchableOpacity>
          );
        }}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="flash-outline" size={36} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Không tìm thấy skill</Text>
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
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  iconBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  summaryRow: { flexDirection: "row", gap: 10, paddingHorizontal: 16, marginBottom: 8 },
  summaryCard: { flex: 1, borderRadius: 14, borderWidth: 1, padding: 12, alignItems: "center" },
  summaryCount: { fontSize: 20, fontFamily: "Inter_700Bold" },
  summaryLabel: { fontSize: 11, fontFamily: "Inter_500Medium", marginTop: 2 },
  searchWrap: { marginBottom: 4 },
  chips: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 8, gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  errorBanner: { marginHorizontal: 16, marginBottom: 8, borderRadius: 10, padding: 10 },
  errorText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  list: { paddingHorizontal: 14, paddingTop: 4, gap: 8 },
  skillCard: { borderRadius: 16, borderWidth: 1, padding: 14, gap: 10 },
  skillTop: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  skillIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  skillInfo: { flex: 1 },
  skillNameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  skillName: { fontSize: 15, fontFamily: "Inter_600SemiBold", flex: 1 },
  skillSlug: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  skillRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  versionText: { fontSize: 10, fontFamily: "Inter_400Regular" },
  skillDesc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  skillFooter: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  langBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  langText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  tagBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  tagText: { fontSize: 10, fontFamily: "Inter_400Regular" },
  emptyWrap: { alignItems: "center", paddingTop: 80, gap: 10 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
});
