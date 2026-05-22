import React, { useState } from "react";
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
import { useVault, VaultDocument, VaultScope, VaultDocType } from "@/hooks/useVault";
import { useAuth } from "@/context/AuthContext";

const DOC_TYPE_ICONS: Record<string, { icon: keyof typeof Ionicons["glyphMap"]; color: string }> = {
  context: { icon: "layers-outline", color: "#60a5fa" },
  memory: { icon: "library-outline", color: "#22c55e" },
  note: { icon: "create-outline", color: "#f59e0b" },
  skill: { icon: "flash-outline", color: "#f97316" },
  episodic: { icon: "book-outline", color: "#a78bfa" },
  media: { icon: "image-outline", color: "#ec4899" },
  document: { icon: "document-text-outline", color: "#71717a" },
};

const SCOPE_COLORS: Record<string, string> = {
  personal: "#22c55e",
  team: "#60a5fa",
  shared: "#f97316",
};

const MOCK_DOCS: VaultDocument[] = [
  { id: "v1", scope: "shared", path: "/context/system_prompt.md", title: "System Prompt", doc_type: "context", summary: "Main system prompt cho các agent", created_at: new Date(Date.now() - 86400000 * 10).toISOString(), updated_at: new Date(Date.now() - 86400000).toISOString() },
  { id: "v2", scope: "personal", path: "/notes/meeting_2025.md", title: "Meeting Notes 2025", doc_type: "note", summary: "Ghi chú cuộc họp Q1 2025", created_at: new Date(Date.now() - 86400000 * 5).toISOString(), updated_at: new Date(Date.now() - 86400000 * 2).toISOString() },
  { id: "v3", scope: "team", path: "/skills/python_guide.md", title: "Python Coding Guide", doc_type: "skill", summary: "Hướng dẫn coding style Python cho team", created_at: new Date(Date.now() - 86400000 * 14).toISOString(), updated_at: new Date(Date.now() - 86400000 * 3).toISOString() },
  { id: "v4", scope: "shared", path: "/docs/api_reference.pdf", title: "API Reference v2", doc_type: "document", created_at: new Date(Date.now() - 86400000 * 20).toISOString(), updated_at: new Date(Date.now() - 86400000 * 7).toISOString() },
  { id: "v5", scope: "personal", path: "/memory/user_prefs.md", title: "User Preferences", doc_type: "memory", summary: "Sở thích và cài đặt cá nhân", created_at: new Date(Date.now() - 86400000 * 30).toISOString(), updated_at: new Date(Date.now() - 3600000).toISOString() },
  { id: "v6", scope: "team", path: "/media/diagram.png", title: "Architecture Diagram", doc_type: "media", created_at: new Date(Date.now() - 86400000 * 4).toISOString(), updated_at: new Date(Date.now() - 86400000 * 4).toISOString() },
];

const SCOPE_FILTERS: { value: VaultScope; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "personal", label: "Personal" },
  { value: "team", label: "Team" },
  { value: "shared", label: "Shared" },
];

const TYPE_FILTERS: { value: VaultDocType; label: string }[] = [
  { value: "all", label: "Loại" },
  { value: "context", label: "Context" },
  { value: "note", label: "Note" },
  { value: "skill", label: "Skill" },
  { value: "document", label: "Document" },
  { value: "media", label: "Media" },
];

function fmtDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  if (diff < 86400000 * 7) return `${Math.floor(diff / 86400000)}d`;
  return new Date(iso).toLocaleDateString("vi", { day: "2-digit", month: "2-digit" });
}

export default function VaultScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { connected } = useAuth();
  const [scope, setScope] = useState<VaultScope>("all");
  const [docType, setDocType] = useState<VaultDocType>("all");
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { documents: liveDocs, total: liveTotal, loading, error, refresh } = useVault(scope, docType);
  const documents = connected && liveDocs.length > 0 ? liveDocs : MOCK_DOCS.filter((d) => {
    if (scope !== "all" && d.scope !== scope) return false;
    if (docType !== "all" && d.doc_type !== docType) return false;
    return true;
  });
  const total = connected ? liveTotal : documents.length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 4 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.titleArea}>
          <Text style={[styles.title, { color: colors.foreground }]}>Vault</Text>
          <Text style={[styles.totalBadge, { color: colors.mutedForeground }]}>{total} docs</Text>
        </View>
        <TouchableOpacity onPress={refresh} style={[styles.iconBtn, { backgroundColor: colors.muted }]} activeOpacity={0.7}>
          {loading ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="refresh-outline" size={15} color={colors.mutedForeground} />}
        </TouchableOpacity>
      </View>

      {/* Scope filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {SCOPE_FILTERS.map((f) => {
          const active = scope === f.value;
          return (
            <TouchableOpacity
              key={f.value}
              onPress={() => setScope(f.value)}
              style={[styles.chip, { backgroundColor: active ? colors.primary + "22" : colors.muted, borderColor: active ? colors.primary + "55" : colors.border }]}
              activeOpacity={0.7}
            >
              {f.value !== "all" && <View style={[styles.scopeDot, { backgroundColor: SCOPE_COLORS[f.value] ?? colors.primary }]} />}
              <Text style={[styles.chipText, { color: active ? colors.primary : colors.mutedForeground }]}>{f.label}</Text>
            </TouchableOpacity>
          );
        })}
        <View style={[styles.dividerV, { backgroundColor: colors.border }]} />
        {TYPE_FILTERS.map((f) => {
          const active = docType === f.value;
          return (
            <TouchableOpacity
              key={f.value}
              onPress={() => setDocType(f.value)}
              style={[styles.chip, { backgroundColor: active ? "#a78bfa22" : colors.muted, borderColor: active ? "#a78bfa55" : colors.border }]}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, { color: active ? "#a78bfa" : colors.mutedForeground }]}>{f.label}</Text>
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
        data={documents}
        keyExtractor={(d) => d.id}
        renderItem={({ item }) => {
          const typeCfg = DOC_TYPE_ICONS[item.doc_type] ?? DOC_TYPE_ICONS.document;
          const scopeColor = SCOPE_COLORS[item.scope] ?? colors.mutedForeground;
          return (
            <View style={[styles.docCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.docIcon, { backgroundColor: typeCfg.color + "20" }]}>
                <Ionicons name={typeCfg.icon} size={20} color={typeCfg.color} />
              </View>
              <View style={styles.docInfo}>
                <Text style={[styles.docTitle, { color: colors.foreground }]} numberOfLines={1}>{item.title}</Text>
                <Text style={[styles.docPath, { color: colors.mutedForeground }]} numberOfLines={1}>{item.path}</Text>
                {item.summary && (
                  <Text style={[styles.docSummary, { color: colors.mutedForeground }]} numberOfLines={2}>{item.summary}</Text>
                )}
                <View style={styles.docMeta}>
                  <View style={[styles.scopeBadge, { backgroundColor: scopeColor + "18" }]}>
                    <Text style={[styles.scopeText, { color: scopeColor }]}>{item.scope}</Text>
                  </View>
                  <View style={[styles.typeBadge, { backgroundColor: typeCfg.color + "15" }]}>
                    <Text style={[styles.typeText, { color: typeCfg.color }]}>{item.doc_type}</Text>
                  </View>
                  <Text style={[styles.dateText, { color: colors.mutedForeground }]}>{fmtDate(item.updated_at)}</Text>
                </View>
              </View>
            </View>
          );
        }}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 40 }]}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="archive-outline" size={36} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Không có tài liệu</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingBottom: 6, gap: 8 },
  backBtn: { padding: 4 },
  titleArea: { flex: 1, flexDirection: "row", alignItems: "baseline", gap: 8 },
  title: { fontSize: 20, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  totalBadge: { fontSize: 12, fontFamily: "Inter_400Regular" },
  iconBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  filterRow: { paddingHorizontal: 14, paddingVertical: 6, gap: 8, alignItems: "center" },
  chip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 11, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  scopeDot: { width: 6, height: 6, borderRadius: 3 },
  dividerV: { width: 1, height: 20 },
  errorBanner: { marginHorizontal: 16, marginBottom: 6, borderRadius: 10, padding: 10 },
  errorText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  list: { paddingHorizontal: 14, paddingTop: 6 },
  docCard: { flexDirection: "row", gap: 12, borderRadius: 18, borderWidth: 1, padding: 14 },
  docIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  docInfo: { flex: 1, gap: 4 },
  docTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  docPath: { fontSize: 11, fontFamily: "monospace" },
  docSummary: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  docMeta: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  scopeBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 7 },
  scopeText: { fontSize: 9, fontFamily: "Inter_600SemiBold", textTransform: "uppercase" },
  typeBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 7 },
  typeText: { fontSize: 9, fontFamily: "Inter_600SemiBold" },
  dateText: { fontSize: 11, fontFamily: "Inter_400Regular", marginLeft: "auto" },
  emptyWrap: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
});
