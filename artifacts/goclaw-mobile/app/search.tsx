import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  FlatList,
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
import { useAgents } from "@/hooks/useAgents";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";

type SearchCategory = "all" | "agents" | "sessions" | "vault" | "memory";

interface SearchResult {
  id: string;
  type: "agent" | "session" | "vault" | "memory" | "screen";
  title: string;
  subtitle?: string;
  icon: keyof typeof Ionicons["glyphMap"];
  color: string;
  onPress: () => void;
}

const CATEGORY_CONFIG: Record<SearchCategory, { label: string; icon: keyof typeof Ionicons["glyphMap"] }> = {
  all: { label: "Tất cả", icon: "search-outline" },
  agents: { label: "Agents", icon: "planet-outline" },
  sessions: { label: "Sessions", icon: "chatbubbles-outline" },
  vault: { label: "Vault", icon: "archive-outline" },
  memory: { label: "Memory", icon: "library-outline" },
};

const QUICK_ACTIONS = [
  { label: "Chat mới", icon: "add-circle-outline" as const, color: "#f97316", desc: "Bắt đầu cuộc trò chuyện", route: "/(tabs)/index" as const },
  { label: "Tạo Agent", icon: "planet-outline" as const, color: "#a78bfa", desc: "Tạo agent mới", route: "/agent/create" as const },
  { label: "Traces", icon: "pulse-outline" as const, color: "#60a5fa", desc: "Xem LLM traces", route: "/traces" as const },
  { label: "Dashboard", icon: "speedometer-outline" as const, color: "#22c55e", desc: "Tổng quan hệ thống", route: "/(tabs)/dashboard" as const },
  { label: "Knowledge Graph", icon: "git-network-outline" as const, color: "#a78bfa", desc: "Entity browser", route: "/knowledge-graph" as const },
  { label: "Vault", icon: "archive-outline" as const, color: "#60a5fa", desc: "Knowledge documents", route: "/vault" as const },
  { label: "Monitor", icon: "terminal-outline" as const, color: "#f59e0b", desc: "Server logs", route: "/(tabs)/monitor" as const },
  { label: "Approvals", icon: "shield-outline" as const, color: "#ef4444", desc: "Tool approvals", route: "/approvals" as const },
];

const SCREEN_COMMANDS = [
  { id: "s1", title: "Providers", subtitle: "LLM provider management", icon: "server-outline" as const, color: "#10b981", route: "/providers" as const },
  { id: "s2", title: "Cron Jobs", subtitle: "Scheduled jobs", icon: "time-outline" as const, color: "#22c55e", route: "/cron" as const },
  { id: "s3", title: "Channels", subtitle: "Messaging channels", icon: "hardware-chip-outline" as const, color: "#60a5fa", route: "/channels" as const },
  { id: "s4", title: "Skills", subtitle: "Agent skills & tools", icon: "flash-outline" as const, color: "#f59e0b", route: "/skills" as const },
  { id: "s5", title: "MCP Servers", subtitle: "Model Context Protocol", icon: "server-outline" as const, color: "#a78bfa", route: "/mcp" as const },
  { id: "s6", title: "Memory", subtitle: "Working & episodic memory", icon: "library-outline" as const, color: "#f97316", route: "/memory" as const },
  { id: "s7", title: "Events", subtitle: "Live event stream", icon: "radio-outline" as const, color: "#a78bfa", route: "/events" as const },
  { id: "s8", title: "Backup", subtitle: "Backup & restore system", icon: "cloud-upload-outline" as const, color: "#f97316", route: "/backup" as const },
  { id: "s9", title: "API Keys", subtitle: "Manage API keys", icon: "key-outline" as const, color: "#f59e0b", route: "/api-keys" as const },
  { id: "s10", title: "Packages", subtitle: "pip / npm packages", icon: "cube-outline" as const, color: "#3b82f6", route: "/packages" as const },
  { id: "s11", title: "Voice & TTS", subtitle: "Text-to-speech providers", icon: "volume-high-outline" as const, color: "#f97316", route: "/voice" as const },
  { id: "s12", title: "Teams", subtitle: "Agent team boards", icon: "people-circle-outline" as const, color: "#22c55e", route: "/teams" as const },
  { id: "s13", title: "Storage", subtitle: "File browser", icon: "folder-open-outline" as const, color: "#f59e0b", route: "/storage" as const },
  { id: "s14", title: "Health", subtitle: "System heartbeat", icon: "heart-outline" as const, color: "#22c55e", route: "/health" as const },
  { id: "s15", title: "Activity Log", subtitle: "Audit log", icon: "pulse-outline" as const, color: "#a1a1aa", route: "/activity" as const },
  { id: "s16", title: "Evolution", subtitle: "Agent self-improvement", icon: "bulb-outline" as const, color: "#f59e0b", route: "/evolution" as const },
];

function highlightQuery(text: string, query: string, colors: ReturnType<typeof useColors>) {
  if (!query) return <Text>{text}</Text>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <Text>{text}</Text>;
  return (
    <Text>
      {text.slice(0, idx)}
      <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold" }}>{text.slice(idx, idx + query.length)}</Text>
      {text.slice(idx + query.length)}
    </Text>
  );
}

export default function SearchScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { connected } = useAuth();
  const { agents } = useAgents();
  const { conversations } = useApp();
  const inputRef = useRef<TextInput>(null);

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<SearchCategory>("all");
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const buildResults = useCallback((): SearchResult[] => {
    const q = query.toLowerCase().trim();
    if (!q) return [];

    const results: SearchResult[] = [];

    if (category === "all" || category === "agents") {
      agents
        .filter(
          (a) =>
            a.agent_key?.toLowerCase().includes(q) ||
            (a.display_name ?? "").toLowerCase().includes(q) ||
            (a.description ?? "").toLowerCase().includes(q),
        )
        .slice(0, 4)
        .forEach((a) =>
          results.push({
            id: `agent:${a.id}`,
            type: "agent",
            title: a.display_name ?? a.agent_key,
            subtitle: `${a.agent_type ?? "predefined"} · ${a.provider ?? ""}`,
            icon: "planet-outline",
            color: "#f97316",
            onPress: () => router.push(`/agent/${a.id}` as never),
          }),
        );
    }

    if (category === "all" || category === "sessions") {
      conversations
        .filter(
          (c) =>
            c.agentName.toLowerCase().includes(q) ||
            c.lastMessage.toLowerCase().includes(q),
        )
        .slice(0, 4)
        .forEach((c) =>
          results.push({
            id: `session:${c.id}`,
            type: "session",
            title: c.agentName,
            subtitle: c.lastMessage.slice(0, 60),
            icon: "chatbubble-outline",
            color: "#60a5fa",
            onPress: () => router.push(`/chat/${c.id}`),
          }),
        );
    }

    if (category === "all") {
      SCREEN_COMMANDS
        .filter((s) => s.title.toLowerCase().includes(q) || s.subtitle.toLowerCase().includes(q))
        .slice(0, 4)
        .forEach((s) =>
          results.push({
            id: s.id,
            type: "screen",
            title: s.title,
            subtitle: s.subtitle,
            icon: s.icon,
            color: s.color,
            onPress: () => router.push(s.route as never),
          }),
        );
    }

    return results;
  }, [query, category, agents, conversations, router]);

  const results = buildResults();
  const q = query.trim();

  const renderResult = ({ item }: { item: SearchResult }) => (
    <TouchableOpacity
      style={[styles.resultRow, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => { item.onPress(); }}
      activeOpacity={0.7}
    >
      <View style={[styles.resultIcon, { backgroundColor: item.color + "18" }]}>
        <Ionicons name={item.icon} size={18} color={item.color} />
      </View>
      <View style={styles.resultInfo}>
        <Text style={[styles.resultTitle, { color: colors.foreground }]} numberOfLines={1}>
          {highlightQuery(item.title, query, colors)}
        </Text>
        {item.subtitle && (
          <Text style={[styles.resultSub, { color: colors.mutedForeground }]} numberOfLines={1}>
            {item.subtitle}
          </Text>
        )}
      </View>
      <View style={[styles.typePill, { backgroundColor: colors.secondary }]}>
        <Text style={[styles.typePillText, { color: colors.mutedForeground }]}>{item.type}</Text>
      </View>
      <Ionicons name="chevron-forward" size={14} color={colors.mutedForeground} />
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Search header */}
      <View style={[styles.header, { paddingTop: topPad + 4 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <View style={[styles.searchBar, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={16} color={colors.mutedForeground} />
          <TextInput
            ref={inputRef}
            style={[styles.searchInput, { color: colors.foreground }]}
            value={query}
            onChangeText={setQuery}
            placeholder="Tìm agents, screens, sessions..."
            placeholderTextColor={colors.mutedForeground}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery("")} activeOpacity={0.7}>
              <Ionicons name="close-circle" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.catRow}
      >
        {(Object.entries(CATEGORY_CONFIG) as [SearchCategory, typeof CATEGORY_CONFIG[SearchCategory]][]).map(([key, cfg]) => {
          const active = category === key;
          return (
            <TouchableOpacity
              key={key}
              onPress={() => setCategory(key)}
              style={[styles.catChip, { backgroundColor: active ? colors.primary + "20" : colors.muted, borderColor: active ? colors.primary + "50" : colors.border }]}
              activeOpacity={0.7}
            >
              <Ionicons name={cfg.icon} size={12} color={active ? colors.primary : colors.mutedForeground} />
              <Text style={[styles.catText, { color: active ? colors.primary : colors.mutedForeground }]}>{cfg.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {q.length === 0 ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.placeholder, { paddingBottom: insets.bottom + 40 }]}>
          {/* Quick Actions Grid */}
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>TRUY CẬP NHANH</Text>
          <View style={styles.quickGrid}>
            {QUICK_ACTIONS.map((a) => (
              <TouchableOpacity
                key={a.label}
                style={[styles.quickCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => router.push(a.route as never)}
                activeOpacity={0.7}
              >
                <View style={[styles.quickIcon, { backgroundColor: a.color + "18" }]}>
                  <Ionicons name={a.icon} size={18} color={a.color} />
                </View>
                <Text style={[styles.quickLabel, { color: colors.foreground }]}>{a.label}</Text>
                <Text style={[styles.quickDesc, { color: colors.mutedForeground }]} numberOfLines={1}>{a.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* All screens */}
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground, marginTop: 16 }]}>TẤT CẢ SCREENS</Text>
          <View style={[styles.screensCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {SCREEN_COMMANDS.map((s, i) => (
              <TouchableOpacity
                key={s.id}
                style={[styles.screenRow, { borderBottomColor: colors.border }, i === SCREEN_COMMANDS.length - 1 && { borderBottomWidth: 0 }]}
                onPress={() => router.push(s.route as never)}
                activeOpacity={0.7}
              >
                <View style={[styles.screenIcon, { backgroundColor: s.color + "15" }]}>
                  <Ionicons name={s.icon} size={15} color={s.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.screenName, { color: colors.foreground }]}>{s.title}</Text>
                  <Text style={[styles.screenDesc, { color: colors.mutedForeground }]}>{s.subtitle}</Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color={colors.mutedForeground} />
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      ) : results.length === 0 ? (
        <View style={styles.centerWrap}>
          <Ionicons name="search-outline" size={36} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Không tìm thấy "{q}"</Text>
          <Text style={[styles.emptyHint, { color: colors.mutedForeground }]}>Thử tìm theo tên agent, màn hình hoặc nội dung tin nhắn</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(r) => r.id}
          renderItem={renderResult}
          contentContainerStyle={[styles.resultList, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text style={[styles.resultCount, { color: colors.mutedForeground }]}>
              {results.length} kết quả cho "{q}"
            </Text>
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
  searchBar: { flex: 1, flexDirection: "row", alignItems: "center", borderRadius: 14, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 9, gap: 8 },
  searchInput: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", padding: 0 },
  filterScroll: { flexGrow: 0, flexShrink: 0 },
  catRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 5, gap: 7 },
  catChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 11, paddingVertical: 5, borderRadius: 20, borderWidth: 1, alignSelf: "flex-start" },
  catText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  placeholder: { paddingHorizontal: 16, paddingTop: 12 },
  sectionLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5, marginBottom: 10 },
  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  quickCard: { width: "47.5%", borderRadius: 16, borderWidth: 1, padding: 14, gap: 6 },
  quickIcon: { width: 34, height: 34, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  quickLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  quickDesc: { fontSize: 11, fontFamily: "Inter_400Regular" },
  screensCard: { borderRadius: 18, borderWidth: 1, overflow: "hidden" },
  screenRow: { flexDirection: "row", alignItems: "center", padding: 12, gap: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  screenIcon: { width: 30, height: 30, borderRadius: 9, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  screenName: { fontSize: 14, fontFamily: "Inter_500Medium" },
  screenDesc: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  centerWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 30 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  emptyHint: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center" },
  resultList: { paddingHorizontal: 14, paddingTop: 8, gap: 8 },
  resultCount: { fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 4 },
  resultRow: { flexDirection: "row", alignItems: "center", borderRadius: 14, borderWidth: 1, padding: 12, gap: 10 },
  resultIcon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  resultInfo: { flex: 1, gap: 2 },
  resultTitle: { fontSize: 14, fontFamily: "Inter_500Medium" },
  resultSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  typePill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  typePillText: { fontSize: 9, fontFamily: "Inter_600SemiBold" },
});
