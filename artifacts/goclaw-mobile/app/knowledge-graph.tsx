import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
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
import { useKnowledgeGraph, KGEntity } from "@/hooks/useKnowledgeGraph";
import { useAgents } from "@/hooks/useAgents";
import { SearchBar } from "@/components/SearchBar";

type ViewMode = "list" | "map";

const TYPE_COLORS: Record<string, string> = {
  person: "#f97316",
  organization: "#60a5fa",
  location: "#22c55e",
  event: "#f59e0b",
  concept: "#a78bfa",
  product: "#3b82f6",
  document: "#71717a",
  technology: "#06b6d4",
};

function getTypeColor(type: string): string {
  return TYPE_COLORS[type.toLowerCase()] ?? "#a1a1aa";
}

const SCREEN_W = Dimensions.get("window").width;

function EntityBubble({
  entity,
  onPress,
}: {
  entity: KGEntity;
  onPress: () => void;
}) {
  const tc = getTypeColor(entity.type);
  const size = Math.max(48, Math.min(88, 48 + (entity.relation_count ?? 0) * 6));
  const fontSize = size > 65 ? 11 : 9;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[
        styles.bubble,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: tc + "22",
          borderColor: tc + "80",
        },
      ]}
    >
      <Text style={[styles.bubbleText, { color: tc, fontSize }]} numberOfLines={2}>
        {entity.name}
      </Text>
      {(entity.relation_count ?? 0) > 0 && (
        <View style={[styles.bubbleRelCount, { backgroundColor: tc }]}>
          <Text style={styles.bubbleRelText}>{entity.relation_count}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

function MapView({
  entities,
  selectedType,
  colors,
  onSelect,
}: {
  entities: KGEntity[];
  selectedType: string | null;
  colors: ReturnType<typeof useColors>;
  onSelect: (e: KGEntity) => void;
}) {
  const byType = useMemo(() => {
    const groups: Record<string, KGEntity[]> = {};
    entities.forEach((e) => {
      const t = e.type || "other";
      if (!groups[t]) groups[t] = [];
      groups[t].push(e);
    });
    return groups;
  }, [entities]);

  const filteredGroups = selectedType ? { [selectedType]: byType[selectedType] ?? [] } : byType;

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.mapScroll}>
      {Object.entries(filteredGroups).map(([type, items]) => {
        const tc = getTypeColor(type);
        return (
          <View key={type} style={styles.typeGroup}>
            <View style={styles.typeGroupHeader}>
              <View style={[styles.typeGroupDot, { backgroundColor: tc }]} />
              <Text style={[styles.typeGroupLabel, { color: tc }]}>
                {type.toUpperCase()}
              </Text>
              <Text style={[styles.typeGroupCount, { color: colors.mutedForeground }]}>
                {items.length}
              </Text>
            </View>
            <View style={styles.bubblesRow}>
              {items.map((e) => (
                <EntityBubble key={e.id} entity={e} onPress={() => onSelect(e)} />
              ))}
            </View>
          </View>
        );
      })}
      {entities.length === 0 && (
        <View style={styles.emptyWrap}>
          <Ionicons name="git-network-outline" size={36} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Chưa có entity nào</Text>
        </View>
      )}
    </ScrollView>
  );
}

function EntityDetailSheet({
  entity,
  colors,
  onClose,
  onDelete,
}: {
  entity: KGEntity;
  colors: ReturnType<typeof useColors>;
  onClose: () => void;
  onDelete: () => void;
}) {
  const tc = getTypeColor(entity.type);
  return (
    <View style={[styles.detailSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.detailHeader}>
        <View style={[styles.detailDot, { backgroundColor: tc }]} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.detailName, { color: colors.foreground }]}>{entity.name}</Text>
          <View style={[styles.typeBadge, { backgroundColor: tc + "18", alignSelf: "flex-start", marginTop: 4 }]}>
            <Text style={[styles.typeText, { color: tc }]}>{entity.type}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={onClose} style={styles.detailClose} activeOpacity={0.7}>
          <Ionicons name="close" size={20} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      {entity.description ? (
        <Text style={[styles.detailDesc, { color: colors.mutedForeground }]}>{entity.description}</Text>
      ) : null}

      <View style={styles.detailStats}>
        {entity.relation_count != null && (
          <View style={[styles.detailStat, { backgroundColor: colors.secondary }]}>
            <Ionicons name="git-network-outline" size={14} color={colors.primary} />
            <Text style={[styles.detailStatText, { color: colors.foreground }]}>{entity.relation_count} relations</Text>
          </View>
        )}
        <View style={[styles.detailStat, { backgroundColor: colors.secondary }]}>
          <Ionicons name="calendar-outline" size={14} color={colors.mutedForeground} />
          <Text style={[styles.detailStatText, { color: colors.mutedForeground }]}>
            {new Date(entity.created_at).toLocaleDateString("vi")}
          </Text>
        </View>
      </View>

      {entity.properties && Object.keys(entity.properties).length > 0 && (
        <View style={[styles.propsBox, { borderColor: colors.border }]}>
          {Object.entries(entity.properties).slice(0, 6).map(([k, v]) => (
            <View key={k} style={[styles.propRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.propKey, { color: colors.mutedForeground }]}>{k}</Text>
              <Text style={[styles.propVal, { color: colors.foreground }]} numberOfLines={1}>{String(v)}</Text>
            </View>
          ))}
        </View>
      )}

      <TouchableOpacity
        style={[styles.deleteBtn, { borderColor: colors.destructive + "50" }]}
        onPress={onDelete}
        activeOpacity={0.8}
      >
        <Ionicons name="trash-outline" size={14} color={colors.destructive} />
        <Text style={[styles.deleteBtnText, { color: colors.destructive }]}>Xóa entity</Text>
      </TouchableOpacity>
    </View>
  );
}

function EntityCard({
  item,
  colors,
  onDelete,
  onPress,
}: {
  item: KGEntity;
  colors: ReturnType<typeof useColors>;
  onDelete: () => void;
  onPress: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const tc = getTypeColor(item.type);

  return (
    <TouchableOpacity
      style={[styles.entityCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => { setExpanded(!expanded); onPress(); }}
      onLongPress={() => Alert.alert("Xóa entity?", item.name, [
        { text: "Hủy", style: "cancel" },
        { text: "Xóa", style: "destructive", onPress: onDelete },
      ])}
      activeOpacity={0.7}
    >
      <View style={styles.entityHeader}>
        <View style={[styles.entityDot, { backgroundColor: tc }]} />
        <View style={styles.entityMain}>
          <Text style={[styles.entityName, { color: colors.foreground }]}>{item.name}</Text>
          <View style={styles.entityMeta}>
            <View style={[styles.typeBadge, { backgroundColor: tc + "18" }]}>
              <Text style={[styles.typeText, { color: tc }]}>{item.type}</Text>
            </View>
            {item.relation_count != null && item.relation_count > 0 && (
              <View style={[styles.relBadge, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                <Ionicons name="git-network-outline" size={10} color={colors.mutedForeground} />
                <Text style={[styles.relText, { color: colors.mutedForeground }]}>{item.relation_count} links</Text>
              </View>
            )}
          </View>
        </View>
        <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={16} color={colors.mutedForeground} />
      </View>

      {expanded && (
        <View style={[styles.entityBody, { borderTopColor: colors.border }]}>
          {item.description && (
            <Text style={[styles.entityDesc, { color: colors.mutedForeground }]}>{item.description}</Text>
          )}
          {item.properties && Object.keys(item.properties).length > 0 && (
            <View style={styles.propsGrid}>
              {Object.entries(item.properties).slice(0, 6).map(([k, v]) => (
                <View key={k} style={[styles.propRow, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.propKey, { color: colors.mutedForeground }]}>{k}</Text>
                  <Text style={[styles.propVal, { color: colors.foreground }]} numberOfLines={1}>{String(v)}</Text>
                </View>
              ))}
            </View>
          )}
          <Text style={[styles.entityDate, { color: colors.mutedForeground }]}>
            {new Date(item.created_at).toLocaleDateString("vi")}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function KnowledgeGraphScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { agents } = useAgents();
  const [selectedAgent, setSelectedAgent] = useState<string>("");
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedEntity, setSelectedEntity] = useState<KGEntity | null>(null);
  const topPad = insets.top;

  const { entities, stats, loading, error, search, setSearch, refresh, deleteEntity } =
    useKnowledgeGraph(selectedAgent || undefined);

  const entityTypes = stats?.entity_types ? Object.keys(stats.entity_types) : [...new Set(entities.map((e) => e.type))];
  const filtered = selectedType ? entities.filter((e) => e.type === selectedType) : entities;

  const handleDelete = (id: string) => {
    setSelectedEntity(null);
    deleteEntity(id);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 4 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.titleArea}>
          <Text style={[styles.title, { color: colors.foreground }]}>Knowledge Graph</Text>
          {stats && (
            <Text style={[styles.count, { color: colors.mutedForeground }]}>
              {stats.entity_count}
            </Text>
          )}
        </View>

        {/* View toggle: List | Map */}
        <View style={[styles.viewToggle, { backgroundColor: colors.muted }]}>
          <TouchableOpacity
            style={[styles.toggleBtn, viewMode === "list" && { backgroundColor: colors.card }]}
            onPress={() => setViewMode("list")}
            activeOpacity={0.7}
          >
            <Ionicons name="list-outline" size={14} color={viewMode === "list" ? colors.foreground : colors.mutedForeground} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, viewMode === "map" && { backgroundColor: colors.card }]}
            onPress={() => setViewMode("map")}
            activeOpacity={0.7}
          >
            <Ionicons name="git-network-outline" size={14} color={viewMode === "map" ? colors.primary : colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={refresh} style={[styles.iconBtn, { backgroundColor: colors.muted }]} activeOpacity={0.7}>
          {loading ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="refresh-outline" size={15} color={colors.mutedForeground} />}
        </TouchableOpacity>
      </View>

      {/* Agent selector */}
      {agents.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.agentRow}>
          {agents.slice(0, 10).map((a) => {
            const active = selectedAgent === a.id;
            return (
              <TouchableOpacity
                key={a.id}
                onPress={() => setSelectedAgent(active ? "" : a.id)}
                style={[styles.agentChip, { backgroundColor: active ? colors.primary + "20" : colors.muted, borderColor: active ? colors.primary + "50" : colors.border }]}
                activeOpacity={0.7}
              >
                <Text style={[styles.agentChipText, { color: active ? colors.primary : colors.mutedForeground }]}>
                  {a.display_name ?? a.agent_key}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      <SearchBar value={search} onChangeText={setSearch} placeholder="Tìm entity..." />

      {/* Stats row */}
      {stats && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{stats.entity_count}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Entities</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: "#60a5fa" }]}>{stats.relation_count}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Relations</Text>
          </View>
          {Object.entries(stats.entity_types).slice(0, 4).map(([type, count]) => (
            <TouchableOpacity
              key={type}
              style={[styles.statCard, { backgroundColor: selectedType === type ? getTypeColor(type) + "25" : colors.card, borderColor: selectedType === type ? getTypeColor(type) + "60" : colors.border }]}
              onPress={() => setSelectedType(selectedType === type ? null : type)}
              activeOpacity={0.8}
            >
              <Text style={[styles.statValue, { color: getTypeColor(type) }]}>{count as number}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{type}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Type filter */}
      {entityTypes.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterRow}>
          <TouchableOpacity
            onPress={() => setSelectedType(null)}
            style={[styles.filterChip, { backgroundColor: !selectedType ? colors.primary + "20" : colors.muted, borderColor: !selectedType ? colors.primary + "50" : colors.border }]}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterText, { color: !selectedType ? colors.primary : colors.mutedForeground }]}>Tất cả</Text>
          </TouchableOpacity>
          {entityTypes.map((t) => {
            const active = selectedType === t;
            const tc = getTypeColor(t);
            return (
              <TouchableOpacity
                key={t}
                onPress={() => setSelectedType(active ? null : t)}
                style={[styles.filterChip, { backgroundColor: active ? tc + "20" : colors.muted, borderColor: active ? tc + "50" : colors.border }]}
                activeOpacity={0.7}
              >
                <View style={[styles.typeDot, { backgroundColor: tc }]} />
                <Text style={[styles.filterText, { color: active ? tc : colors.mutedForeground }]}>{t}</Text>
                {stats?.entity_types[t] != null && (
                  <Text style={[styles.filterCount, { color: active ? tc : colors.mutedForeground }]}>
                    {stats.entity_types[t]}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {!selectedAgent ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="git-network-outline" size={44} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Knowledge Graph</Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Chọn agent để xem các entity và quan hệ trong bộ nhớ
          </Text>
        </View>
      ) : error ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="alert-circle-outline" size={36} color={colors.destructive} />
          <Text style={[styles.emptyText, { color: colors.destructive }]}>{error}</Text>
        </View>
      ) : viewMode === "map" ? (
        <View style={{ flex: 1 }}>
          <MapView
            entities={filtered}
            selectedType={selectedType}
            colors={colors}
            onSelect={(e) => setSelectedEntity(e)}
          />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(e) => e.id}
          renderItem={({ item }) => (
            <EntityCard
              item={item}
              colors={colors}
              onDelete={() => deleteEntity(item.id)}
              onPress={() => setSelectedEntity(item)}
            />
          )}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            loading ? (
              <View style={styles.emptyWrap}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : (
              <View style={styles.emptyWrap}>
                <Ionicons name="git-network-outline" size={36} color={colors.mutedForeground} />
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Chưa có entity nào</Text>
              </View>
            )
          }
        />
      )}

      {/* Entity detail bottom sheet */}
      {selectedEntity && (
        <EntityDetailSheet
          entity={selectedEntity}
          colors={colors}
          onClose={() => setSelectedEntity(null)}
          onDelete={() => handleDelete(selectedEntity.id)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingBottom: 6, gap: 8 },
  backBtn: { padding: 4 },
  titleArea: { flex: 1, flexDirection: "row", alignItems: "baseline", gap: 8 },
  title: { fontSize: 20, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  count: { fontSize: 12, fontFamily: "Inter_400Regular" },
  viewToggle: { flexDirection: "row", borderRadius: 10, padding: 3, gap: 2 },
  toggleBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  iconBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  filterScroll: { flexGrow: 0, flexShrink: 0 },
  agentRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 5, gap: 7 },
  agentChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  agentChipText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  statsRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 6, gap: 8 },
  statCard: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, alignItems: "center", minWidth: 70 },
  statValue: { fontSize: 18, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 2 },
  filterRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 5, gap: 7 },
  filterChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1, alignSelf: "flex-start" },
  filterText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  filterCount: { fontSize: 10, fontFamily: "Inter_700Bold" },
  typeDot: { width: 6, height: 6, borderRadius: 3 },
  typeBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  typeText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  list: { padding: 14, gap: 8 },
  entityCard: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  entityHeader: { flexDirection: "row", alignItems: "center", padding: 12, gap: 10 },
  entityDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  entityMain: { flex: 1, gap: 4 },
  entityName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  entityMeta: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  relBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
  relText: { fontSize: 10, fontFamily: "Inter_400Regular" },
  entityBody: { borderTopWidth: StyleSheet.hairlineWidth, padding: 12, gap: 8 },
  entityDesc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  propsGrid: { gap: 0 },
  propsBox: { borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, overflow: "hidden" },
  propRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, paddingHorizontal: 10, borderBottomWidth: StyleSheet.hairlineWidth, gap: 10 },
  propKey: { fontSize: 12, fontFamily: "Inter_500Medium", flexShrink: 0 },
  propVal: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1, textAlign: "right" },
  entityDate: { fontSize: 10, fontFamily: "Inter_400Regular" },
  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60, gap: 10, paddingHorizontal: 30 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", marginTop: 4 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  mapScroll: { padding: 14, gap: 16, paddingBottom: 60 },
  typeGroup: { gap: 10 },
  typeGroupHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  typeGroupDot: { width: 8, height: 8, borderRadius: 4 },
  typeGroupLabel: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.6 },
  typeGroupCount: { fontSize: 11, fontFamily: "Inter_400Regular" },
  bubblesRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  bubble: { alignItems: "center", justifyContent: "center", borderWidth: 1.5, position: "relative" },
  bubbleText: { fontFamily: "Inter_600SemiBold", textAlign: "center", paddingHorizontal: 4 },
  bubbleRelCount: { position: "absolute", top: -4, right: -4, width: 16, height: 16, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  bubbleRelText: { color: "#fff", fontSize: 8, fontFamily: "Inter_700Bold" },
  detailSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 20,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  detailHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  detailDot: { width: 12, height: 12, borderRadius: 6, marginTop: 4, flexShrink: 0 },
  detailName: { fontSize: 18, fontFamily: "Inter_700Bold" },
  detailClose: { padding: 4 },
  detailDesc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  detailStats: { flexDirection: "row", gap: 8 },
  detailStat: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  detailStatText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  deleteBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, height: 40, borderRadius: 12, borderWidth: 1, marginTop: 4 },
  deleteBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
