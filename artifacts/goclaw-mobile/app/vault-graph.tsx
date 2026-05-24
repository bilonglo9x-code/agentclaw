import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
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

interface GraphNode {
  id: string;
  label?: string;
  type?: string;
  doc_type?: string;
  weight?: number;
}

interface GraphEdge {
  source: string;
  target: string;
  label?: string;
}

interface VaultGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  total_nodes: number;
  total_edges: number;
}

const NODE_TYPE_COLORS: Record<string, string> = {
  context: "#60a5fa",
  memory: "#22c55e",
  note: "#f59e0b",
  skill: "#f97316",
  episodic: "#a78bfa",
  media: "#ec4899",
  document: "#71717a",
  entity: "#34d399",
  concept: "#fbbf24",
  person: "#c084fc",
  place: "#38bdf8",
};

function getNodeColor(node: GraphNode): string {
  const t = node.type ?? node.doc_type ?? "document";
  return NODE_TYPE_COLORS[t] ?? "#71717a";
}

function getNodeSize(node: GraphNode): number {
  const w = node.weight ?? 1;
  return Math.max(24, Math.min(60, 24 + w * 4));
}

export default function VaultGraphScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { http, connected } = useAuth();
  const topPad = insets.top;

  const [graph, setGraph] = useState<VaultGraph | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [limit, setLimit] = useState(50);

  const load = async (lim = limit) => {
    if (!http || !connected) return;
    setLoading(true);
    setError(null);
    try {
      const res = await http.get<VaultGraph>("/v1/vault/graph", { limit: String(lim) });
      setGraph(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi tải graph");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (connected) load();
  }, [connected]);

  const typeStats = graph
    ? graph.nodes.reduce<Record<string, number>>((acc, n) => {
        const t = n.type ?? n.doc_type ?? "document";
        acc[t] = (acc[t] ?? 0) + 1;
        return acc;
      }, {})
    : {};

  const maxNodes = Math.max(...(graph?.nodes.map((n) => n.weight ?? 1) ?? [1]));

  const relatedEdges = selectedNode
    ? graph?.edges.filter((e) => e.source === selectedNode.id || e.target === selectedNode.id) ?? []
    : [];

  const relatedNodeIds = new Set(relatedEdges.flatMap((e) => [e.source, e.target]));
  const relatedNodes = graph?.nodes.filter((n) => relatedNodeIds.has(n.id) && n.id !== selectedNode?.id) ?? [];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 4 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>Vault Graph</Text>
        <TouchableOpacity
          onPress={() => load()}
          style={[styles.iconBtn, { backgroundColor: colors.muted }]}
          activeOpacity={0.7}
        >
          {loading ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="refresh-outline" size={15} color={colors.mutedForeground} />}
        </TouchableOpacity>
      </View>

      {error && (
        <View style={[styles.errorBanner, { backgroundColor: colors.destructive + "15" }]}>
          <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
        </View>
      )}

      {!connected && (
        <View style={[styles.errorBanner, { backgroundColor: "#f59e0b15" }]}>
          <Text style={[styles.errorText, { color: "#f59e0b" }]}>Chưa kết nối — cần server để xem graph</Text>
        </View>
      )}

      {graph && (
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statCount, { color: colors.primary }]}>{graph.total_nodes}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Nodes</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statCount, { color: "#22c55e" }]}>{graph.total_edges}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Edges</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statCount, { color: "#f59e0b" }]}>{Object.keys(typeStats).length}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Types</Text>
          </View>
        </View>
      )}

      {/* Type legend */}
      {graph && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.legendScroll}
          contentContainerStyle={styles.legendContent}
        >
          {Object.entries(typeStats).map(([type, count]) => (
            <View key={type} style={[styles.legendChip, { backgroundColor: (NODE_TYPE_COLORS[type] ?? "#71717a") + "20", borderColor: (NODE_TYPE_COLORS[type] ?? "#71717a") + "40" }]}>
              <View style={[styles.legendDot, { backgroundColor: NODE_TYPE_COLORS[type] ?? "#71717a" }]} />
              <Text style={[styles.legendText, { color: NODE_TYPE_COLORS[type] ?? colors.mutedForeground }]}>{type}</Text>
              <Text style={[styles.legendCount, { color: colors.mutedForeground }]}>{count}</Text>
            </View>
          ))}
        </ScrollView>
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {loading && !graph ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Đang tải graph...</Text>
          </View>
        ) : graph ? (
          <>
            {/* Node bubbles — visual representation */}
            <View style={[styles.graphSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.graphSectionTitle, { color: colors.foreground }]}>Nodes</Text>
              <View style={styles.bubbleWrap}>
                {graph.nodes.slice(0, 60).map((node) => {
                  const color = getNodeColor(node);
                  const size = getNodeSize(node);
                  const selected = selectedNode?.id === node.id;
                  return (
                    <TouchableOpacity
                      key={node.id}
                      onPress={() => setSelectedNode(selected ? null : node)}
                      style={[styles.bubble, {
                        width: size,
                        height: size,
                        borderRadius: size / 2,
                        backgroundColor: selected ? color + "50" : color + "25",
                        borderColor: selected ? color : color + "40",
                        borderWidth: selected ? 2 : 1,
                      }]}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.bubbleText, { color, fontSize: size < 34 ? 7 : 8 }]} numberOfLines={1}>
                        {(node.label ?? node.id).slice(0, 8)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {graph.nodes.length > 60 && (
                <Text style={[styles.moreText, { color: colors.mutedForeground }]}>
                  +{graph.nodes.length - 60} more nodes
                </Text>
              )}
            </View>

            {/* Selected node detail */}
            {selectedNode && (
              <View style={[styles.detailCard, { backgroundColor: colors.card, borderColor: (NODE_TYPE_COLORS[selectedNode.type ?? selectedNode.doc_type ?? "document"] ?? colors.primary) + "60" }]}>
                <View style={styles.detailHeader}>
                  <View style={[styles.nodeIcon, { backgroundColor: getNodeColor(selectedNode) + "20" }]}>
                    <Ionicons name="git-network-outline" size={16} color={getNodeColor(selectedNode)} />
                  </View>
                  <View style={styles.detailInfo}>
                    <Text style={[styles.nodeLabel, { color: colors.foreground }]}>{selectedNode.label ?? selectedNode.id}</Text>
                    <Text style={[styles.nodeType, { color: getNodeColor(selectedNode) }]}>
                      {selectedNode.type ?? selectedNode.doc_type ?? "document"}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedNode(null)} activeOpacity={0.7}>
                    <Ionicons name="close" size={18} color={colors.mutedForeground} />
                  </TouchableOpacity>
                </View>

                {relatedNodes.length > 0 && (
                  <View style={styles.relatedWrap}>
                    <Text style={[styles.relatedTitle, { color: colors.mutedForeground }]}>Liên kết ({relatedEdges.length})</Text>
                    {relatedNodes.slice(0, 5).map((n) => (
                      <View key={n.id} style={[styles.relatedRow, { borderBottomColor: colors.border }]}>
                        <View style={[styles.relatedDot, { backgroundColor: getNodeColor(n) }]} />
                        <Text style={[styles.relatedLabel, { color: colors.foreground }]} numberOfLines={1}>{n.label ?? n.id}</Text>
                        <Text style={[styles.relatedType, { color: colors.mutedForeground }]}>{n.type ?? n.doc_type}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Limit controls */}
            <View style={styles.limitRow}>
              {[20, 50, 100].map((lim) => (
                <TouchableOpacity
                  key={lim}
                  onPress={() => { setLimit(lim); load(lim); }}
                  style={[styles.limitBtn, {
                    backgroundColor: limit === lim ? colors.primary + "20" : colors.card,
                    borderColor: limit === lim ? colors.primary + "60" : colors.border,
                  }]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.limitBtnText, { color: limit === lim ? colors.primary : colors.mutedForeground }]}>{lim}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        ) : (
          <View style={styles.emptyWrap}>
            <Ionicons name="git-network-outline" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              {connected ? "Chưa có dữ liệu graph" : "Cần kết nối để xem graph"}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingBottom: 10, gap: 8 },
  backBtn: { padding: 4 },
  title: { flex: 1, fontSize: 20, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  iconBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  errorBanner: { marginHorizontal: 16, marginBottom: 8, borderRadius: 10, padding: 10 },
  errorText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  statsRow: { flexDirection: "row", gap: 10, paddingHorizontal: 16, marginBottom: 10 },
  statCard: { flex: 1, borderRadius: 14, borderWidth: 1, padding: 12, alignItems: "center" },
  statCount: { fontSize: 18, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 10, fontFamily: "Inter_500Medium", marginTop: 2 },
  legendScroll: { maxHeight: 40 },
  legendContent: { paddingHorizontal: 16, gap: 8, alignItems: "center" },
  legendChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 10, borderWidth: 1 },
  legendDot: { width: 7, height: 7, borderRadius: 4 },
  legendText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  legendCount: { fontSize: 10, fontFamily: "Inter_400Regular" },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 14 },
  loadingWrap: { alignItems: "center", paddingTop: 60, gap: 12 },
  loadingText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  graphSection: { borderRadius: 18, borderWidth: 1, padding: 16 },
  graphSectionTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", marginBottom: 14 },
  bubbleWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" },
  bubble: { alignItems: "center", justifyContent: "center", padding: 2 },
  bubbleText: { fontFamily: "Inter_600SemiBold", textAlign: "center" },
  moreText: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 10, textAlign: "center" },
  detailCard: { borderRadius: 18, borderWidth: 2, padding: 16, gap: 12 },
  detailHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  nodeIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  detailInfo: { flex: 1 },
  nodeLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  nodeType: { fontSize: 11, fontFamily: "Inter_500Medium", marginTop: 2, textTransform: "capitalize" },
  relatedWrap: { gap: 6 },
  relatedTitle: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5 },
  relatedRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth },
  relatedDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  relatedLabel: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular" },
  relatedType: { fontSize: 10, fontFamily: "Inter_400Regular" },
  limitRow: { flexDirection: "row", gap: 8, justifyContent: "center" },
  limitBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  limitBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  emptyWrap: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
});
