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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { useAgents as useRealAgents } from "@/hooks/useAgents";
import { AgentCard } from "@/components/AgentCard";
import { SearchBar } from "@/components/SearchBar";
import { EmptyState } from "@/components/EmptyState";

const FILTERS = [
  { label: "Tất cả", value: "all" },
  { label: "Agent", value: "open" },
  { label: "Predefined", value: "predefined" },
  { label: "Active", value: "active" },
  { label: "Idle", value: "idle" },
];

export default function AgentsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { agents: mockAgents } = useApp();
  const { connected } = useAuth();
  const { agents: realAgents, loading } = useRealAgents();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const rawAgents = connected && realAgents.length > 0
    ? realAgents.map((a) => ({
        id: a.id,
        key: a.agent_key,
        displayName: a.display_name ?? a.id,
        description: a.workspace ?? "",
        type: a.agent_type as "open" | "predefined",
        status: (a.status === "active" ? "active" : "idle") as "active" | "idle",
        model: a.model,
        provider: a.provider ?? "",
      }))
    : mockAgents;

  const filtered = useMemo(
    () =>
      rawAgents.filter((a) => {
        const q = search.toLowerCase();
        const matchSearch =
          !q ||
          a.displayName.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q);
        const matchFilter =
          filter === "all" ||
          (filter === "active" && a.status === "active") ||
          (filter === "idle" && a.status === "idle") ||
          a.type === filter;
        return matchSearch && matchFilter;
      }),
    [rawAgents, search, filter],
  );

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Agents</Text>
        <View style={styles.headerRight}>
          {loading && <ActivityIndicator color={colors.primary} size="small" />}
          <TouchableOpacity
            style={[styles.fab, { backgroundColor: colors.primary }]}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchWrap}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Tìm agent..." />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
      >
        {FILTERS.map((f) => {
          const active = filter === f.value;
          return (
            <TouchableOpacity
              key={f.value}
              onPress={() => setFilter(f.value)}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? colors.primary + "25" : colors.muted,
                  borderColor: active ? colors.primary + "60" : colors.border,
                },
              ]}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, { color: active ? colors.primary : colors.mutedForeground }]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {filtered.length === 0 ? (
        <EmptyState icon="hardware-chip-outline" title="Không tìm thấy agent" subtitle="Thử điều chỉnh bộ lọc" />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          numColumns={2}
          renderItem={({ item }) => (
            <View style={styles.cardWrap}>
              <AgentCard agent={item} onPress={() => {}} />
            </View>
          )}
          contentContainerStyle={[styles.grid, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
          columnWrapperStyle={styles.row}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  fab: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  searchWrap: { marginBottom: 4 },
  chips: { paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  grid: { paddingHorizontal: 12, paddingTop: 8 },
  row: { gap: 8, marginBottom: 8, paddingHorizontal: 4 },
  cardWrap: { flex: 1 },
});
