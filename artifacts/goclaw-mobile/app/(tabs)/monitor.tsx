import React, { useEffect, useRef, useState } from "react";
import {
  FlatList,
  Platform,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { useLogs, LogLevel, LogEntry } from "@/hooks/useLogs";
import { useApprovals } from "@/hooks/useApprovals";

type Filter = "all" | LogLevel;

const FILTER_TABS: { label: string; value: Filter }[] = [
  { label: "All", value: "all" },
  { label: "Error", value: "error" },
  { label: "Warn", value: "warn" },
  { label: "Info", value: "info" },
  { label: "Debug", value: "debug" },
];

const LEVEL_CONFIG: Record<LogLevel, { color: string; bg: string; icon: keyof typeof Ionicons["glyphMap"] }> = {
  info: { color: "#60a5fa", bg: "#60a5fa20", icon: "information-circle-outline" },
  warn: { color: "#f59e0b", bg: "#f59e0b20", icon: "warning-outline" },
  error: { color: "#ef4444", bg: "#ef444420", icon: "alert-circle-outline" },
  debug: { color: "#a1a1aa", bg: "#a1a1aa15", icon: "code-outline" },
};


function formatTs(ts: number): string {
  return new Date(ts).toLocaleTimeString("vi", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export default function MonitorScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { connected } = useAuth();
  const { logs, tailing, level, error: tailError, startTail, stopTail, clearLogs, setLevel } = useLogs();
  const { pendingCount } = useApprovals();
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [autoScroll, setAutoScroll] = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  const listRef = useRef<FlatList>(null);
  const topPad = insets.top;

  const displayLogs = logs;

  const filtered = displayLogs.filter((l) => {
    const matchLevel = filter === "all" || l.level === filter;
    const matchSearch = !search || l.message.toLowerCase().includes(search.toLowerCase()) || (l.source ?? "").toLowerCase().includes(search.toLowerCase());
    return matchLevel && matchSearch;
  });

  const counts = displayLogs.reduce((acc, l) => {
    acc[l.level as LogLevel] = (acc[l.level as LogLevel] ?? 0) + 1;
    return acc;
  }, {} as Record<LogLevel, number>);

  // Auto-start tailing when connected
  useEffect(() => {
    if (connected && !tailing) {
      startTail("info");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected]);

  useEffect(() => {
    if (autoScroll && filtered.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [filtered.length, autoScroll]);

  const toggleTail = () => {
    if (tailing) stopTail();
    else startTail(level as LogLevel);
  };

  const handleExport = async () => {
    const text = filtered
      .map((l) => `[${formatTs(l.timestamp)}] [${l.level.toUpperCase()}]${l.source ? ` (${l.source})` : ""} ${l.message}`)
      .join("\n");
    await Share.share({ message: text, title: "GoClaw Logs" });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <View style={styles.headerLeft}>
          <Text style={[styles.title, { color: colors.foreground }]}>Monitor</Text>
          {tailing && logs.length > 0 ? (
            <View style={[styles.tailingBadge, { backgroundColor: "#22c55e15" }]}>
              <View style={[styles.tailingDot, { backgroundColor: "#22c55e" }]} />
              <Text style={[styles.tailingText, { color: "#22c55e" }]}>Live</Text>
            </View>
          ) : connected && tailing ? (
            <View style={[styles.tailingBadge, { backgroundColor: "#60a5fa15" }]}>
              <Text style={[styles.tailingText, { color: "#60a5fa" }]}>Chờ logs...</Text>
            </View>
          ) : !connected ? (
            <View style={[styles.tailingBadge, { backgroundColor: "#f59e0b15" }]}>
              <Text style={[styles.tailingText, { color: "#f59e0b" }]}>Demo</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: showSearch ? colors.primary + "25" : colors.muted }]}
            onPress={() => { setShowSearch((v) => !v); if (showSearch) setSearch(""); }}
            activeOpacity={0.7}
          >
            <Ionicons name="search-outline" size={16} color={showSearch ? colors.primary : colors.mutedForeground} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: autoScroll ? colors.primary + "25" : colors.muted }]}
            onPress={() => setAutoScroll((v) => !v)}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-down-circle-outline" size={16} color={autoScroll ? colors.primary : colors.mutedForeground} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: tailing ? "#22c55e20" : colors.muted }]}
            onPress={toggleTail}
            activeOpacity={0.7}
          >
            {tailError ? (
              <Ionicons name="alert-circle-outline" size={16} color={colors.destructive} />
            ) : (
              <Ionicons name={tailing ? "pause-circle-outline" : "play-circle-outline"} size={16} color={tailing ? "#22c55e" : colors.mutedForeground} />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: colors.muted }]}
            onPress={handleExport}
            activeOpacity={0.7}
          >
            <Ionicons name="share-outline" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: colors.muted }]}
            onPress={clearLogs}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search bar */}
      {showSearch && (
        <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={14} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Tìm kiếm logs..."
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
            autoFocus
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")} activeOpacity={0.7}>
              <Ionicons name="close-circle" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Search result hint */}
      {search.length > 0 && (
        <View style={styles.searchHint}>
          <Text style={[styles.searchHintText, { color: colors.mutedForeground }]}>
            {filtered.length} kết quả cho "{search}"
          </Text>
        </View>
      )}

      {/* Level filter tabs */}
      <View style={[styles.filterRow, { borderBottomColor: colors.border }]}>
        {FILTER_TABS.map((tab) => {
          const active = filter === tab.value;
          const cfg = tab.value !== "all" ? LEVEL_CONFIG[tab.value as LogLevel] : null;
          const count = tab.value === "all" ? displayLogs.length : (counts[tab.value as LogLevel] ?? 0);
          return (
            <TouchableOpacity
              key={tab.value}
              style={[styles.filterTab, active && { borderBottomColor: cfg?.color ?? colors.primary, borderBottomWidth: 2 }]}
              onPress={() => setFilter(tab.value)}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterTabText, { color: active ? (cfg?.color ?? colors.primary) : colors.mutedForeground }]}>
                {tab.label}
              </Text>
              {count > 0 && (
                <View style={[styles.filterCount, { backgroundColor: cfg?.bg ?? colors.primary + "20" }]}>
                  <Text style={[styles.filterCountText, { color: cfg?.color ?? colors.primary }]}>{count}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Log list */}
      <FlatList
        ref={listRef}
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const cfg = LEVEL_CONFIG[item.level as LogLevel] ?? LEVEL_CONFIG.info;
          const isError = item.level === "error";
          return (
            <View style={[styles.logRow, isError && { backgroundColor: "#ef444408" }]}>
              <View style={[styles.levelDot, { backgroundColor: cfg.color }]} />
              <View style={styles.logBody}>
                <View style={styles.logMeta}>
                  <Text style={[styles.logTs, { color: colors.mutedForeground }]}>{formatTs(item.timestamp)}</Text>
                  <View style={[styles.levelTag, { backgroundColor: cfg.bg }]}>
                    <Text style={[styles.levelTagText, { color: cfg.color }]}>{item.level.toUpperCase()}</Text>
                  </View>
                  {item.source && (
                    <View style={[styles.sourceTag, { backgroundColor: colors.muted }]}>
                      <Text style={[styles.sourceTagText, { color: colors.mutedForeground }]}>{item.source}</Text>
                    </View>
                  )}
                </View>
                <Text
                  style={[
                    styles.logMsg,
                    { color: isError ? "#ef4444" : item.level === "warn" ? "#f59e0b" : item.level === "debug" ? colors.mutedForeground : colors.foreground },
                  ]}
                  selectable
                >
                  {item.message}
                </Text>
              </View>
            </View>
          );
        }}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="terminal-outline" size={36} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              {search ? "Không tìm thấy log phù hợp" : "Chưa có logs"}
            </Text>
          </View>
        }
      />

      {/* Status bar */}
      <View style={[styles.statusBar, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: insets.bottom + 80 }]}>
        <View style={styles.statusLeft}>
          <View style={[styles.statusDot, { backgroundColor: connected ? "#22c55e" : colors.mutedForeground }]} />
          <Text style={[styles.statusText, { color: colors.mutedForeground }]}>
            {connected ? (tailing ? `Streaming` : `Connected`) : "Demo"} · {filtered.length}/{displayLogs.length} logs
          </Text>
        </View>
        {pendingCount > 0 && (
          <View style={[styles.pendingBadge, { backgroundColor: colors.primary + "20" }]}>
            <Text style={[styles.pendingText, { color: colors.primary }]}>{pendingCount} approvals</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  headerLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  headerActions: { flexDirection: "row", gap: 5 },
  title: { fontSize: 20, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  tailingBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  tailingDot: { width: 6, height: 6, borderRadius: 3 },
  tailingText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  iconBtn: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 14,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    height: 40,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular" },
  searchHint: { paddingHorizontal: 14, paddingBottom: 4 },
  searchHintText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 4,
  },
  filterTab: { flex: 1, alignItems: "center", paddingVertical: 8, gap: 3, borderBottomWidth: 2, borderBottomColor: "transparent" },
  filterTabText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  filterCount: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: 6, minWidth: 18, alignItems: "center" },
  filterCountText: { fontSize: 9, fontFamily: "Inter_700Bold" },
  list: { paddingTop: 4 },
  logRow: { flexDirection: "row", paddingHorizontal: 14, paddingVertical: 7, gap: 10, alignItems: "flex-start" },
  levelDot: { width: 5, height: 5, borderRadius: 3, marginTop: 5, flexShrink: 0 },
  logBody: { flex: 1, gap: 3 },
  logMeta: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 5 },
  logTs: { fontSize: 10, fontFamily: "Inter_400Regular" },
  levelTag: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: 5 },
  levelTagText: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 0.3 },
  sourceTag: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: 5 },
  sourceTagText: { fontSize: 9, fontFamily: "Inter_400Regular" },
  logMsg: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  emptyWrap: { alignItems: "center", paddingTop: 80, gap: 10 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  statusBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  statusLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  pendingBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  pendingText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
});
