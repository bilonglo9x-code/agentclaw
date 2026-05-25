import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
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
import { useAuth } from "@/context/AuthContext";

interface BuiltinToolData {
  name: string;
  display_name: string;
  description: string;
  category: string;
  enabled: boolean;
  tenant_enabled: boolean | null;
  settings: Record<string, unknown>;
  requires: string[];
  created_at: string;
  updated_at: string;
}

const CATEGORY_CONFIG: Record<string, { icon: keyof typeof Ionicons["glyphMap"]; color: string; label: string }> = {
  filesystem: { icon: "folder-outline", color: "#f59e0b", label: "Filesystem" },
  runtime: { icon: "code-slash-outline", color: "#a78bfa", label: "Runtime" },
  web: { icon: "globe-outline", color: "#60a5fa", label: "Web" },
  memory: { icon: "library-outline", color: "#22c55e", label: "Memory" },
  media: { icon: "images-outline", color: "#ec4899", label: "Media" },
  browser: { icon: "browsers-outline", color: "#06b6d4", label: "Browser" },
  sessions: { icon: "chatbubbles-outline", color: "#f97316", label: "Sessions" },
  messaging: { icon: "send-outline", color: "#3b82f6", label: "Messaging" },
  scheduling: { icon: "time-outline", color: "#10b981", label: "Scheduling" },
  subagents: { icon: "people-outline", color: "#8b5cf6", label: "Subagents" },
  skills: { icon: "flash-outline", color: "#f59e0b", label: "Skills" },
  delegation: { icon: "git-branch-outline", color: "#ef4444", label: "Delegation" },
  teams: { icon: "people-circle-outline", color: "#0ea5e9", label: "Teams" },
  general: { icon: "build-outline", color: "#71717a", label: "General" },
};

const CATEGORY_ORDER = [
  "filesystem", "runtime", "web", "memory", "media", "browser",
  "sessions", "messaging", "scheduling", "subagents", "skills", "delegation", "teams", "general",
];

function fmtCategory(cat: string): { icon: keyof typeof Ionicons["glyphMap"]; color: string; label: string } {
  return CATEGORY_CONFIG[cat] ?? { icon: "build-outline", color: "#71717a", label: cat };
}

export default function BuiltinToolsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { http, connected } = useAuth();
  const [tools, setTools] = useState<BuiltinToolData[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [toggling, setToggling] = useState<string | null>(null);
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set(CATEGORY_ORDER));
  const topPad = insets.top;

  const loadTools = useCallback(async () => {
    if (!http || !connected) return;
    setLoading(true);
    try {
      const res = await http.get<{ tools: BuiltinToolData[] }>("/v1/tools/builtin");
      setTools(res.tools ?? []);
    } catch {}
    finally { setLoading(false); }
  }, [http, connected]);

  useEffect(() => { loadTools(); }, [loadTools]);

  const handleRefresh = async () => { setRefreshing(true); await loadTools(); setRefreshing(false); };

  const handleToggle = async (tool: BuiltinToolData) => {
    if (!http) return;
    setToggling(tool.name);
    const next = !tool.enabled;
    setTools((prev) => prev.map((t) => t.name === tool.name ? { ...t, enabled: next } : t));
    try {
      await http.put(`/v1/tools/builtin/${tool.name}`, { enabled: next });
    } catch {
      setTools((prev) => prev.map((t) => t.name === tool.name ? { ...t, enabled: tool.enabled } : t));
    }
    setToggling(null);
  };

  const filtered = tools.filter((t) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return t.name.includes(q) || t.display_name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q);
  });

  const grouped = new Map<string, BuiltinToolData[]>();
  for (const tool of filtered) {
    const cat = tool.category || "general";
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(tool);
  }

  const sortedCategories = CATEGORY_ORDER.filter((c) => grouped.has(c));
  for (const cat of grouped.keys()) {
    if (!sortedCategories.includes(cat)) sortedCategories.push(cat);
  }

  const toggleCategory = (cat: string) => {
    setExpandedCats((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const activeCount = tools.filter((t) => t.enabled).length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 4, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>Builtin Tools</Text>
        <TouchableOpacity onPress={loadTools} style={[styles.iconBtn, { backgroundColor: colors.muted }]} activeOpacity={0.7}>
          {loading ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="refresh-outline" size={15} color={colors.mutedForeground} />}
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Ionicons name="search-outline" size={14} color={colors.mutedForeground} />
        <TextInput
          style={[styles.searchInput, { color: colors.foreground }]}
          placeholder="Tìm công cụ..."
          placeholderTextColor={colors.mutedForeground}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")} activeOpacity={0.7}>
            <Ionicons name="close-circle" size={15} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}
      </View>

      {/* Stats */}
      <View style={[styles.statsRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.statsText, { color: colors.mutedForeground }]}>
          {tools.length} tools · {activeCount} đang bật
        </Text>
      </View>

      {!connected ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={40} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Chưa kết nối server</Text>
        </View>
      ) : (
        <FlatList
          style={{ flex: 1 }}
          data={sortedCategories}
          keyExtractor={(cat) => cat}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
          contentContainerStyle={{ paddingBottom: insets.bottom + 40, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.center}>
                <Ionicons name="construct-outline" size={44} color={colors.mutedForeground} />
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Không có tools</Text>
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                  {search ? `Không tìm thấy "${search}"` : "Chưa tải được danh sách tools"}
                </Text>
              </View>
            ) : null
          }
          renderItem={({ item: cat }) => {
            const catTools = grouped.get(cat) ?? [];
            const expanded = expandedCats.has(cat);
            const { icon, color, label } = fmtCategory(cat);
            const enabledInCat = catTools.filter((t) => t.enabled).length;
            return (
              <View>
                {/* Category header */}
                <TouchableOpacity
                  style={[styles.catHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
                  onPress={() => toggleCategory(cat)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.catIcon, { backgroundColor: color + "20" }]}>
                    <Ionicons name={icon} size={16} color={color} />
                  </View>
                  <Text style={[styles.catLabel, { color: colors.foreground }]}>{label}</Text>
                  <View style={[styles.catBadge, { backgroundColor: color + "15" }]}>
                    <Text style={[styles.catBadgeText, { color }]}>{enabledInCat}/{catTools.length}</Text>
                  </View>
                  <Ionicons name={expanded ? "chevron-down" : "chevron-forward"} size={14} color={colors.mutedForeground} />
                </TouchableOpacity>
                {/* Tools in category */}
                {expanded && catTools.map((tool) => (
                  <View
                    key={tool.name}
                    style={[styles.toolRow, { borderBottomColor: colors.border, opacity: tool.enabled ? 1 : 0.65 }]}
                  >
                    <View style={{ flex: 1, gap: 3 }}>
                      <Text style={[styles.toolName, { color: colors.foreground }]}>{tool.display_name}</Text>
                      <Text style={[styles.toolDesc, { color: colors.mutedForeground }]} numberOfLines={2}>
                        {tool.description}
                      </Text>
                      {tool.requires.length > 0 && (
                        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 2 }}>
                          {tool.requires.map((r) => (
                            <View key={r} style={[styles.requireBadge, { backgroundColor: "#ef444415" }]}>
                              <Ionicons name="key-outline" size={9} color="#ef4444" />
                              <Text style={[styles.requireText, { color: "#ef4444" }]}>{r}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                    {toggling === tool.name ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <Switch
                        value={tool.enabled}
                        onValueChange={() => handleToggle(tool)}
                        trackColor={{ true: colors.primary }}
                        style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }}
                      />
                    )}
                  </View>
                ))}
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth, gap: 8 },
  backBtn: { padding: 4 },
  title: { flex: 1, fontSize: 17, fontFamily: "Inter_600SemiBold" },
  iconBtn: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  searchBar: { flexDirection: "row", alignItems: "center", marginHorizontal: 14, marginTop: 10, marginBottom: 6, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, height: 40, gap: 8 },
  searchInput: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular" },
  statsRow: { marginHorizontal: 14, marginBottom: 8, borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8 },
  statsText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60, gap: 10 },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  catHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, gap: 10 },
  catIcon: { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  catLabel: { flex: 1, fontSize: 14, fontFamily: "Inter_600SemiBold" },
  catBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  catBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  toolRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 24, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 },
  toolName: { fontSize: 13, fontFamily: "Inter_500Medium" },
  toolDesc: { fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 16 },
  requireBadge: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  requireText: { fontSize: 9, fontFamily: "Inter_500Medium" },
});
