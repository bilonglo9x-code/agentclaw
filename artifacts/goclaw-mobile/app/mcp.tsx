import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
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

export default function MCPScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { servers: liveServers, loading, error, toggle, refresh } = useMCP();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const servers = liveServers.length > 0 ? liveServers : MOCK_SERVERS;
  const enabledCount = servers.filter((s) => s.enabled).length;
  const totalAgents = servers.reduce((sum, s) => sum + (s.agent_count ?? 0), 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 4 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>MCP Servers</Text>
        <TouchableOpacity onPress={refresh} style={[styles.iconBtn, { backgroundColor: colors.muted }]} activeOpacity={0.7}>
          {loading ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="refresh-outline" size={15} color={colors.mutedForeground} />}
        </TouchableOpacity>
      </View>

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
                {item.timeout_sec != null && (
                  <View style={styles.statItem}>
                    <Ionicons name="timer-outline" size={11} color={colors.mutedForeground} />
                    <Text style={[styles.statText, { color: colors.mutedForeground }]}>{item.timeout_sec}s timeout</Text>
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
  summaryRow: { flexDirection: "row", gap: 10, paddingHorizontal: 16, marginBottom: 12 },
  summaryCard: { flex: 1, borderRadius: 14, borderWidth: 1, padding: 12, alignItems: "center" },
  sumCount: { fontSize: 20, fontFamily: "Inter_700Bold" },
  sumLabel: { fontSize: 11, fontFamily: "Inter_500Medium", marginTop: 2 },
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
  statsRow: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 14, paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth },
  statItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  statText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  emptyWrap: { alignItems: "center", paddingTop: 80, gap: 10 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
});
