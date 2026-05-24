import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useMCP, MCPServerData } from "@/hooks/useMCP";
import { SearchBar } from "@/components/SearchBar";

const TRANSPORT_CONFIG: Record<string, { color: string; label: string; icon: keyof typeof Ionicons["glyphMap"] }> = {
  stdio: { color: "#a78bfa", label: "STDIO", icon: "terminal-outline" },
  sse: { color: "#60a5fa", label: "SSE", icon: "radio-outline" },
  "streamable-http": { color: "#22c55e", label: "HTTP", icon: "globe-outline" },
};

const MOCK_SERVERS: MCPServerData[] = [
  { id: "m1", name: "filesystem", display_name: "Filesystem MCP", transport: "stdio", command: "npx", args: ["-y", "@modelcontextprotocol/server-filesystem", "/workspace"], tool_prefix: "fs_", timeout_sec: 30, enabled: true, agent_count: 3, created_at: new Date(Date.now() - 86400000 * 20).toISOString(), updated_at: new Date().toISOString() },
  { id: "m2", name: "postgres_mcp", display_name: "PostgreSQL MCP", transport: "stdio", command: "npx", args: ["@modelcontextprotocol/server-postgres"], tool_prefix: "db_", timeout_sec: 60, enabled: true, agent_count: 2, created_at: new Date(Date.now() - 86400000 * 10).toISOString(), updated_at: new Date().toISOString() },
  { id: "m3", name: "slack_mcp", display_name: "Slack MCP (SSE)", transport: "sse", url: "https://mcp.slack.com/events", tool_prefix: "slack_", timeout_sec: 30, enabled: false, agent_count: 1, created_at: new Date(Date.now() - 86400000 * 5).toISOString(), updated_at: new Date().toISOString() },
  { id: "m4", name: "web_search", display_name: "Web Search MCP", transport: "streamable-http", url: "https://api.example.com/mcp", tool_prefix: "web_", timeout_sec: 45, enabled: true, agent_count: 4, created_at: new Date(Date.now() - 86400000 * 2).toISOString(), updated_at: new Date().toISOString() },
];

const MOCK_TOOL_COUNTS: Record<string, number> = {
  m1: 8, m2: 12, m3: 5, m4: 7,
};

const MOCK_LATENCY: Record<string, number> = {
  m1: 45, m2: 120, m3: 0, m4: 280,
};

function getLatencyColor(ms: number, enabled: boolean): string {
  if (!enabled || ms === 0) return "#71717a";
  if (ms < 100) return "#22c55e";
  if (ms < 300) return "#f59e0b";
  return "#ef4444";
}

export default function MCPScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { servers: liveServers, loading, error, toggle, refresh } = useMCP();
  const topPad = insets.top;
  const [search, setSearch] = useState("");
  const [transportFilter, setTransportFilter] = useState<string | null>(null);

  const allServers = liveServers;
  const servers = useMemo(() => {
    let list = allServers;
    if (transportFilter) list = list.filter((s) => s.transport === transportFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((s) => s.display_name.toLowerCase().includes(q) || s.name.toLowerCase().includes(q) || (s.url ?? "").toLowerCase().includes(q));
    }
    return list;
  }, [allServers, search, transportFilter]);

  const enabledCount = allServers.filter((s) => s.enabled).length;
  const totalAgents = allServers.reduce((sum, s) => sum + (s.agent_count ?? 0), 0);
  const totalTools = allServers.reduce((sum, s) => sum + (s.tool_count ?? 0), 0);

  const handleAddServer = () => {
    Alert.alert("Thêm MCP Server", "Cấu hình MCP server mới qua web console.\n\nHỗ trợ: STDIO, SSE, Streamable HTTP", [
      { text: "Hủy", style: "cancel" },
      { text: "Mở Console", onPress: () => {} },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 4 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>MCP Servers</Text>
        <TouchableOpacity
          onPress={handleAddServer}
          style={[styles.iconBtn, { backgroundColor: colors.primary + "20" }]}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={18} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={refresh} style={[styles.iconBtn, { backgroundColor: colors.muted }]} activeOpacity={0.7}>
          {loading ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="refresh-outline" size={15} color={colors.mutedForeground} />}
        </TouchableOpacity>
      </View>

      {/* Search + transport filter */}
      <View style={styles.searchWrap}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Tìm MCP server..." />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterRow}>
        {[null, "stdio", "sse", "streamable-http"].map((t) => {
          const active = transportFilter === t;
          const cfg = t ? TRANSPORT_CONFIG[t] : null;
          const label = t ? (TRANSPORT_CONFIG[t]?.label ?? t) : "Tất cả";
          const col = cfg?.color ?? colors.primary;
          return (
            <TouchableOpacity
              key={t ?? "all"}
              onPress={() => setTransportFilter(t)}
              style={[styles.filterChip, { backgroundColor: active ? col + "20" : colors.muted, borderColor: active ? col + "50" : colors.border }]}
              activeOpacity={0.7}
            >
              {cfg && <Ionicons name={cfg.icon} size={11} color={active ? col : colors.mutedForeground} />}
              <Text style={[styles.filterChipText, { color: active ? col : colors.mutedForeground }]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sumCount, { color: "#22c55e" }]}>{enabledCount}</Text>
          <Text style={[styles.sumLabel, { color: colors.mutedForeground }]}>Enabled</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sumCount, { color: colors.foreground }]}>{servers.length}</Text>
          <Text style={[styles.sumLabel, { color: colors.mutedForeground }]}>Servers</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sumCount, { color: colors.primary }]}>{totalAgents}</Text>
          <Text style={[styles.sumLabel, { color: colors.mutedForeground }]}>Agents</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sumCount, { color: "#f59e0b" }]}>{totalTools}</Text>
          <Text style={[styles.sumLabel, { color: colors.mutedForeground }]}>Tools</Text>
        </View>
      </View>

      {error && (
        <View style={[styles.errorBanner, { backgroundColor: colors.destructive + "15" }]}>
          <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
        </View>
      )}

      <FlatList
        data={servers}
        keyExtractor={(s) => s.id}
        renderItem={({ item }) => {
          const tCfg = TRANSPORT_CONFIG[item.transport] ?? TRANSPORT_CONFIG.stdio;
          const endpoint = item.transport === "stdio" ? [item.command, ...(item.args ?? [])].join(" ") : item.url ?? "—";
          const toolCount = item.tool_count ?? 0;
          const latency = item.latency_ms ?? 0;
          const latencyColor = getLatencyColor(latency, item.enabled);

          return (
            <View style={[styles.serverCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.cardTop}>
                <View style={[styles.serverIcon, { backgroundColor: tCfg.color + "20" }]}>
                  <Ionicons name={tCfg.icon} size={20} color={tCfg.color} />
                </View>
                <View style={styles.serverInfo}>
                  <Text style={[styles.displayName, { color: colors.foreground }]}>{item.display_name}</Text>
                  <View style={styles.metaRow}>
                    <View style={[styles.transportBadge, { backgroundColor: tCfg.color + "18" }]}>
                      <Text style={[styles.transportText, { color: tCfg.color }]}>{tCfg.label}</Text>
                    </View>
                    {item.tool_prefix && (
                      <Text style={[styles.prefix, { color: colors.mutedForeground }]}>prefix: {item.tool_prefix}</Text>
                    )}
                  </View>
                </View>
                <Switch
                  value={item.enabled}
                  onValueChange={(v) => toggle(item.id, v)}
                  trackColor={{ true: colors.primary, false: colors.muted }}
                  thumbColor="#fff"
                  ios_backgroundColor={colors.muted}
                />
              </View>

              <View style={[styles.endpointRow, { borderTopColor: colors.border }]}>
                <Ionicons name={item.transport === "stdio" ? "terminal-outline" : "link-outline"} size={12} color={colors.mutedForeground} />
                <Text style={[styles.endpointText, { color: colors.mutedForeground }]} numberOfLines={1}>{endpoint}</Text>
              </View>

              <View style={[styles.statsRow, { borderTopColor: colors.border }]}>
                {item.agent_count != null && (
                  <View style={styles.statItem}>
                    <Ionicons name="planet-outline" size={11} color={colors.mutedForeground} />
                    <Text style={[styles.statText, { color: colors.mutedForeground }]}>{item.agent_count} agents</Text>
                  </View>
                )}
                {toolCount > 0 && (
                  <View style={[styles.toolBadge, { backgroundColor: "#f59e0b18" }]}>
                    <Ionicons name="hammer-outline" size={11} color="#f59e0b" />
                    <Text style={[styles.toolText, { color: "#f59e0b" }]}>{toolCount} tools</Text>
                  </View>
                )}
                {item.timeout_sec != null && (
                  <View style={styles.statItem}>
                    <Ionicons name="timer-outline" size={11} color={colors.mutedForeground} />
                    <Text style={[styles.statText, { color: colors.mutedForeground }]}>{item.timeout_sec}s</Text>
                  </View>
                )}
                {item.enabled && latency > 0 && (
                  <View style={[styles.latencyBadge, { backgroundColor: latencyColor + "18" }]}>
                    <Ionicons name="speedometer-outline" size={11} color={latencyColor} />
                    <Text style={[styles.latencyText, { color: latencyColor }]}>{latency}ms</Text>
                  </View>
                )}
              </View>
            </View>
          );
        }}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="server-outline" size={36} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Không có MCP servers</Text>
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
  searchWrap: { paddingHorizontal: 14, paddingBottom: 6 },
  filterScroll: { flexGrow: 0, flexShrink: 0 },
  filterRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingBottom: 8, gap: 7 },
  filterChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 11, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  filterChipText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  summaryRow: { flexDirection: "row", gap: 10, paddingHorizontal: 16, marginBottom: 12 },
  summaryCard: { flex: 1, borderRadius: 14, borderWidth: 1, padding: 10, alignItems: "center" },
  sumCount: { fontSize: 18, fontFamily: "Inter_700Bold" },
  sumLabel: { fontSize: 10, fontFamily: "Inter_500Medium", marginTop: 2 },
  errorBanner: { marginHorizontal: 16, marginBottom: 8, borderRadius: 10, padding: 10 },
  errorText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  list: { paddingHorizontal: 14, paddingTop: 4 },
  serverCard: { borderRadius: 18, borderWidth: 1, overflow: "hidden" },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  serverIcon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  serverInfo: { flex: 1, gap: 5 },
  displayName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  transportBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 7 },
  transportText: { fontSize: 10, fontFamily: "Inter_700Bold" },
  prefix: { fontSize: 11, fontFamily: "monospace" },
  endpointRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth },
  endpointText: { fontSize: 11, fontFamily: "monospace", flex: 1 },
  statsRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth, flexWrap: "wrap" },
  statItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  statText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  toolBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  toolText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  latencyBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8, marginLeft: "auto" },
  latencyText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  emptyWrap: { alignItems: "center", paddingTop: 80, gap: 10 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
});
