import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
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
import { useAgents } from "@/hooks/useAgents";
import { useSessions } from "@/hooks/useSessions";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";

type SearchCategory = "all" | "agents" | "sessions" | "vault" | "memory";

interface SearchResult {
  id: string;
  type: "agent" | "session" | "vault" | "memory";
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
  const [searching, setSearching] = useState(false);
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
        .slice(0, 5)
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
        .slice(0, 5)
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

    return results;
  }, [query, category, agents, conversations]);

  const results = buildResults();

  const renderResult = ({ item }: { item: SearchResult }) => (
    <TouchableOpacity
      style={[styles.resultRow, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={item.onPress}
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
            placeholder="Tìm agents, sessions, vault..."
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
      <FlatList
        horizontal
        data={Object.entries(CATEGORY_CONFIG) as [SearchCategory, typeof CATEGORY_CONFIG[SearchCategory]][]}
        keyExtractor={([k]) => k}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.catRow}
        renderItem={({ item: [key, cfg] }) => {
          const active = category === key;
          return (
            <TouchableOpacity
              onPress={() => setCategory(key)}
              style={[styles.catChip, { backgroundColor: active ? colors.primary + "20" : colors.muted, borderColor: active ? colors.primary + "50" : colors.border }]}
              activeOpacity={0.7}
            >
              <Ionicons name={cfg.icon} size={12} color={active ? colors.primary : colors.mutedForeground} />
              <Text style={[styles.catText, { color: active ? colors.primary : colors.mutedForeground }]}>{cfg.label}</Text>
            </TouchableOpacity>
          );
        }}
      />

      {query.trim().length === 0 ? (
        /* Recent / suggestions */
        <View style={styles.placeholder}>
          <Ionicons name="search-outline" size={48} color={colors.muted} />
          <Text style={[styles.placeholderTitle, { color: colors.foreground }]}>Tìm kiếm toàn cục</Text>
          <Text style={[styles.placeholderSub, { color: colors.mutedForeground }]}>
            Tìm agents, sessions, vault docs, memory...
          </Text>
          {/* Quick links */}
          <View style={styles.quickLinks}>
            {[
              { label: "Tất cả Agents", icon: "planet-outline" as const, color: "#f97316", onPress: () => router.push("/(tabs)/agents") },
              { label: "Sessions gần đây", icon: "chatbubbles-outline" as const, color: "#60a5fa", onPress: () => router.push("/sessions") },
              { label: "Vault", icon: "archive-outline" as const, color: "#a78bfa", onPress: () => router.push("/vault") },
              { label: "Memory", icon: "library-outline" as const, color: "#22c55e", onPress: () => router.push("/memory") },
            ].map((q) => (
              <TouchableOpacity
                key={q.label}
                style={[styles.quickLink, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={q.onPress}
                activeOpacity={0.7}
              >
                <Ionicons name={q.icon} size={16} color={q.color} />
                <Text style={[styles.quickLinkText, { color: colors.foreground }]}>{q.label}</Text>
                <Ionicons name="chevron-forward" size={14} color={colors.mutedForeground} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : searching ? (
        <View style={styles.centerWrap}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : results.length === 0 ? (
        <View style={styles.centerWrap}>
          <Ionicons name="search-outline" size={36} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Không tìm thấy "{query}"</Text>
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
              {results.length} kết quả cho "{query}"
            </Text>
          }
        />
      )}
    </View>
  );
}

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

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingBottom: 8, gap: 8 },
  backBtn: { padding: 4 },
  searchBar: { flex: 1, flexDirection: "row", alignItems: "center", borderRadius: 14, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 9, gap: 8 },
  searchInput: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", padding: 0 },
  catRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 5, gap: 7 },
  catChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 11, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  catText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  placeholder: { flex: 1, alignItems: "center", paddingTop: 40, gap: 8, paddingHorizontal: 30 },
  placeholderTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", marginTop: 8 },
  placeholderSub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  quickLinks: { width: "100%", gap: 8, marginTop: 16 },
  quickLink: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 14, borderWidth: 1, padding: 14 },
  quickLinkText: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium" },
  centerWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  resultList: { paddingHorizontal: 14, paddingTop: 8, gap: 8 },
  resultCount: { fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 4 },
  resultRow: { flexDirection: "row", alignItems: "center", borderRadius: 14, borderWidth: 1, padding: 12, gap: 10 },
  resultIcon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  resultInfo: { flex: 1, gap: 2 },
  resultTitle: { fontSize: 14, fontFamily: "Inter_500Medium" },
  resultSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
});
