import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
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
import { useProviders, ProviderData } from "@/hooks/useProviders";
import { SearchBar } from "@/components/SearchBar";

const PROVIDER_ICONS: Record<string, { color: string; icon: keyof typeof Ionicons["glyphMap"] }> = {
  openai: { color: "#10b981", icon: "sparkles-outline" },
  anthropic: { color: "#d97706", icon: "color-wand-outline" },
  gemini: { color: "#3b82f6", icon: "diamond-outline" },
  google: { color: "#3b82f6", icon: "diamond-outline" },
  mistral: { color: "#7c3aed", icon: "flash-outline" },
  cohere: { color: "#f97316", icon: "server-outline" },
  together: { color: "#06b6d4", icon: "layers-outline" },
  groq: { color: "#a78bfa", icon: "rocket-outline" },
  deepseek: { color: "#60a5fa", icon: "telescope-outline" },
  ollama: { color: "#22c55e", icon: "home-outline" },
  azure: { color: "#0078d4", icon: "cloud-outline" },
};

const PROVIDER_SPECS: Record<string, { latency: string; cost: string; context: string; strengths: string[] }> = {
  openai: { latency: "~800ms", cost: "$0.002/1K", context: "128K", strengths: ["Coding", "Chat", "Vision"] },
  anthropic: { latency: "~1.2s", cost: "$0.003/1K", context: "200K", strengths: ["Long context", "Analysis", "Safety"] },
  gemini: { latency: "~600ms", cost: "$0.001/1K", context: "1M", strengths: ["Multimodal", "Speed", "Long context"] },
  mistral: { latency: "~500ms", cost: "$0.0007/1K", context: "32K", strengths: ["Speed", "Efficiency", "Open"] },
  groq: { latency: "~150ms", cost: "$0.0005/1K", context: "128K", strengths: ["Ultra-fast", "Low cost", "LPU"] },
  deepseek: { latency: "~900ms", cost: "$0.0003/1K", context: "64K", strengths: ["Math", "Code", "Low cost"] },
  ollama: { latency: "varies", cost: "Free", context: "varies", strengths: ["Privacy", "Offline", "Custom"] },
  cohere: { latency: "~700ms", cost: "$0.001/1K", context: "128K", strengths: ["RAG", "Embeddings", "Enterprise"] },
};

const MOCK_PROVIDERS: ProviderData[] = [
  { id: "p1", name: "openai_main", display_name: "OpenAI", provider_type: "openai", api_base: "https://api.openai.com/v1", enabled: true, created_at: new Date(Date.now() - 86400000 * 60).toISOString(), updated_at: new Date().toISOString() },
  { id: "p2", name: "anthropic_main", display_name: "Anthropic", provider_type: "anthropic", enabled: true, created_at: new Date(Date.now() - 86400000 * 30).toISOString(), updated_at: new Date().toISOString() },
  { id: "p3", name: "gemini_flash", display_name: "Google Gemini", provider_type: "gemini", enabled: true, created_at: new Date(Date.now() - 86400000 * 15).toISOString(), updated_at: new Date().toISOString() },
  { id: "p4", name: "ollama_local", display_name: "Ollama (Local)", provider_type: "ollama", api_base: "http://localhost:11434/v1", enabled: false, created_at: new Date(Date.now() - 86400000 * 5).toISOString(), updated_at: new Date().toISOString() },
  { id: "p5", name: "groq_fast", display_name: "Groq", provider_type: "groq", enabled: true, created_at: new Date(Date.now() - 86400000 * 2).toISOString(), updated_at: new Date().toISOString() },
  { id: "p6", name: "deepseek_v3", display_name: "DeepSeek", provider_type: "deepseek", enabled: false, created_at: new Date(Date.now() - 86400000).toISOString(), updated_at: new Date().toISOString() },
];

function fmtTime(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m trước`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h trước`;
  return `${Math.floor(diff / 86400000)}d trước`;
}

function CompareModal({
  providers,
  colors,
  onClose,
}: {
  providers: ProviderData[];
  colors: ReturnType<typeof useColors>;
  onClose: () => void;
}) {
  const ROWS = [
    { key: "latency", label: "Latency", icon: "time-outline" as const },
    { key: "cost", label: "Cost/1K tok", icon: "wallet-outline" as const },
    { key: "context", label: "Context", icon: "layers-outline" as const },
  ];

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[compareStyles.container, { backgroundColor: colors.background }]}>
        <View style={[compareStyles.header, { borderBottomColor: colors.border }]}>
          <Text style={[compareStyles.title, { color: colors.foreground }]}>So sánh Providers</Text>
          <TouchableOpacity onPress={onClose} style={[compareStyles.closeBtn, { backgroundColor: colors.muted }]} activeOpacity={0.7}>
            <Ionicons name="close" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          {/* Provider header row */}
          <View style={[compareStyles.tableHeader, { borderBottomColor: colors.border }]}>
            <View style={compareStyles.labelCol} />
            {providers.map((p) => {
              const cfg = PROVIDER_ICONS[p.provider_type] ?? { color: colors.primary, icon: "server-outline" as const };
              return (
                <View key={p.id} style={compareStyles.providerCol}>
                  <View style={[compareStyles.providerHeaderIcon, { backgroundColor: cfg.color + "20" }]}>
                    <Ionicons name={cfg.icon} size={20} color={cfg.color} />
                  </View>
                  <Text style={[compareStyles.providerHeaderName, { color: colors.foreground }]} numberOfLines={1}>
                    {p.display_name}
                  </Text>
                  <View style={[compareStyles.statusDot, { backgroundColor: p.enabled ? "#22c55e" : "#a1a1aa" }]} />
                </View>
              );
            })}
          </View>

          {/* Spec rows */}
          {ROWS.map((row) => (
            <View key={row.key} style={[compareStyles.tableRow, { borderBottomColor: colors.border }]}>
              <View style={compareStyles.labelCol}>
                <Ionicons name={row.icon} size={13} color={colors.mutedForeground} />
                <Text style={[compareStyles.rowLabel, { color: colors.mutedForeground }]}>{row.label}</Text>
              </View>
              {providers.map((p) => {
                const spec = PROVIDER_SPECS[p.provider_type];
                const specStr: Record<string, string> = spec ? { latency: spec.latency, cost: spec.cost, context: spec.context } : {};
                const val = specStr[row.key];
                return (
                  <View key={p.id} style={compareStyles.providerCol}>
                    <Text style={[compareStyles.cellVal, { color: colors.foreground }]}>{val ?? "—"}</Text>
                  </View>
                );
              })}
            </View>
          ))}

          {/* Strengths */}
          <View style={[compareStyles.tableRow, { borderBottomColor: colors.border, alignItems: "flex-start" }]}>
            <View style={[compareStyles.labelCol, { paddingTop: 4 }]}>
              <Ionicons name="star-outline" size={13} color={colors.mutedForeground} />
              <Text style={[compareStyles.rowLabel, { color: colors.mutedForeground }]}>Strengths</Text>
            </View>
            {providers.map((p) => {
              const spec = PROVIDER_SPECS[p.provider_type];
              return (
                <View key={p.id} style={[compareStyles.providerCol, { alignItems: "flex-start" }]}>
                  {(spec?.strengths ?? ["—"]).map((s) => (
                    <View key={s} style={[compareStyles.strengthTag, { backgroundColor: colors.secondary }]}>
                      <Text style={[compareStyles.strengthText, { color: colors.foreground }]}>{s}</Text>
                    </View>
                  ))}
                </View>
              );
            })}
          </View>

          {/* Tip */}
          <View style={[compareStyles.tip, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
            <Text style={[compareStyles.tipText, { color: colors.mutedForeground }]}>
              Latency và cost là ước tính. Giá thực tế phụ thuộc vào model cụ thể.
            </Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

export default function ProvidersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { providers: liveProviders, loading, error, toggle, refresh } = useProviders();
  const [compareMode, setCompareMode] = useState(false);
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showCompare, setShowCompare] = useState(false);
  const topPad = insets.top;

  const providers = liveProviders.length > 0 ? liveProviders : MOCK_PROVIDERS;
  const enabledCount = providers.filter((p) => p.enabled).length;
  const filteredProviders = useMemo(() => {
    if (!search.trim()) return providers;
    const q = search.toLowerCase();
    return providers.filter((p) =>
      (p.display_name ?? p.name ?? "").toLowerCase().includes(q) ||
      (p.name ?? "").toLowerCase().includes(q) ||
      (p.api_base ?? "").toLowerCase().includes(q),
    );
  }, [providers, search]);
  const selectedProviders = providers.filter((p) => selectedIds.has(p.id));

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else if (s.size < 3) s.add(id);
      return s;
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 4 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>Providers</Text>
        <TouchableOpacity
          style={[styles.compareBtn, { backgroundColor: compareMode ? colors.primary + "25" : colors.muted, borderColor: compareMode ? colors.primary + "60" : colors.border }]}
          onPress={() => { setCompareMode((v) => !v); setSelectedIds(new Set()); }}
          activeOpacity={0.7}
        >
          <Ionicons name="git-compare-outline" size={14} color={compareMode ? colors.primary : colors.mutedForeground} />
          <Text style={[styles.compareBtnText, { color: compareMode ? colors.primary : colors.mutedForeground }]}>Compare</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setShowSearch((v) => !v)}
          style={[styles.iconBtn, { backgroundColor: showSearch ? colors.primary + "22" : colors.muted }]}
          activeOpacity={0.7}
        >
          <Ionicons name="search-outline" size={15} color={showSearch ? colors.primary : colors.mutedForeground} />
        </TouchableOpacity>
        <TouchableOpacity onPress={refresh} style={[styles.iconBtn, { backgroundColor: colors.muted }]} activeOpacity={0.7}>
          {loading ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="refresh-outline" size={15} color={colors.mutedForeground} />}
        </TouchableOpacity>
      </View>

      {showSearch && (
        <View style={styles.searchWrap}>
          <SearchBar value={search} onChangeText={setSearch} placeholder="Tìm provider..." />
        </View>
      )}

      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sumCount, { color: "#22c55e" }]}>{enabledCount}</Text>
          <Text style={[styles.sumLabel, { color: colors.mutedForeground }]}>Enabled</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sumCount, { color: colors.foreground }]}>{providers.length}</Text>
          <Text style={[styles.sumLabel, { color: colors.mutedForeground }]}>Total</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sumCount, { color: colors.mutedForeground }]}>{providers.length - enabledCount}</Text>
          <Text style={[styles.sumLabel, { color: colors.mutedForeground }]}>Disabled</Text>
        </View>
      </View>

      {compareMode && (
        <View style={[styles.compareBanner, { backgroundColor: colors.primary + "12", borderColor: colors.primary + "30" }]}>
          <Ionicons name="git-compare-outline" size={14} color={colors.primary} />
          <Text style={[styles.compareBannerText, { color: colors.primary }]}>
            {selectedIds.size === 0 ? "Chọn 2-3 providers để so sánh" : `Đã chọn ${selectedIds.size}/3`}
          </Text>
          {selectedIds.size >= 2 && (
            <TouchableOpacity
              style={[styles.compareStartBtn, { backgroundColor: colors.primary }]}
              onPress={() => setShowCompare(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.compareStartText}>So sánh →</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {error && (
        <View style={[styles.errorBanner, { backgroundColor: colors.destructive + "15" }]}>
          <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
        </View>
      )}

      <FlatList
        data={filteredProviders}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => {
          const cfg = PROVIDER_ICONS[item.provider_type] ?? { color: colors.primary, icon: "server-outline" as const };
          const isSelected = selectedIds.has(item.id);
          const spec = PROVIDER_SPECS[item.provider_type];

          return (
            <TouchableOpacity
              style={[
                styles.providerCard,
                {
                  backgroundColor: colors.card,
                  borderColor: isSelected ? colors.primary + "70" : colors.border,
                },
              ]}
              activeOpacity={compareMode ? 0.7 : 0.95}
              onPress={compareMode ? () => toggleSelect(item.id) : undefined}
            >
              {compareMode && (
                <View style={[styles.selectCheck, { borderColor: isSelected ? colors.primary : colors.border, backgroundColor: isSelected ? colors.primary : "transparent" }]}>
                  {isSelected && <Ionicons name="checkmark" size={12} color="#fff" />}
                </View>
              )}

              <View style={[styles.providerIcon, { backgroundColor: cfg.color + "20" }]}>
                <Ionicons name={cfg.icon} size={22} color={cfg.color} />
              </View>

              <View style={styles.providerInfo}>
                <View style={styles.providerTopRow}>
                  <Text style={[styles.displayName, { color: colors.foreground }]}>{item.display_name}</Text>
                  {spec && (
                    <View style={[styles.latencyBadge, { backgroundColor: colors.secondary }]}>
                      <Ionicons name="time-outline" size={9} color={colors.mutedForeground} />
                      <Text style={[styles.latencyText, { color: colors.mutedForeground }]}>{spec.latency}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.metaRow}>
                  <View style={[styles.typeBadge, { backgroundColor: cfg.color + "18" }]}>
                    <Text style={[styles.typeText, { color: cfg.color }]}>{item.provider_type}</Text>
                  </View>
                  {item.api_base && (
                    <Text style={[styles.apiBase, { color: colors.mutedForeground }]} numberOfLines={1}>
                      {item.api_base.replace(/^https?:\/\//, "").replace(/\/v.*$/, "")}
                    </Text>
                  )}
                </View>
                {spec && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
                    <View style={styles.strengthRow}>
                      {spec.strengths.map((s) => (
                        <View key={s} style={[styles.strengthTag, { backgroundColor: cfg.color + "12" }]}>
                          <Text style={[styles.strengthText, { color: cfg.color }]}>{s}</Text>
                        </View>
                      ))}
                      <View style={[styles.strengthTag, { backgroundColor: colors.secondary }]}>
                        <Text style={[styles.strengthText, { color: colors.mutedForeground }]}>{spec.cost}</Text>
                      </View>
                      <View style={[styles.strengthTag, { backgroundColor: colors.secondary }]}>
                        <Text style={[styles.strengthText, { color: colors.mutedForeground }]}>{spec.context} ctx</Text>
                      </View>
                    </View>
                  </ScrollView>
                )}
                <Text style={[styles.updatedAt, { color: colors.mutedForeground }]}>
                  Updated {fmtTime(item.updated_at)}
                </Text>
              </View>

              {!compareMode && (
                <Switch
                  value={item.enabled}
                  onValueChange={(v) => toggle(item.id, v)}
                  trackColor={{ true: colors.primary, false: colors.muted }}
                  thumbColor="#fff"
                  ios_backgroundColor={colors.muted}
                />
              )}
            </TouchableOpacity>
          );
        }}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="server-outline" size={36} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Không có providers</Text>
          </View>
        }
      />

      {showCompare && selectedProviders.length >= 2 && (
        <CompareModal
          providers={selectedProviders}
          colors={colors}
          onClose={() => setShowCompare(false)}
        />
      )}
    </View>
  );
}

const compareStyles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  title: { fontSize: 20, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  tableHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  tableRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  labelCol: { width: 90, flexDirection: "row", alignItems: "center", gap: 6 },
  providerCol: { flex: 1, alignItems: "center", gap: 4 },
  providerHeaderIcon: { width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  providerHeaderName: { fontSize: 12, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  rowLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  cellVal: { fontSize: 13, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  strengthTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginBottom: 4 },
  strengthText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  tip: { flexDirection: "row", alignItems: "flex-start", gap: 10, margin: 16, borderRadius: 14, borderWidth: 1, padding: 14 },
  tipText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingBottom: 10, gap: 8 },
  backBtn: { padding: 4 },
  title: { flex: 1, fontSize: 20, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  compareBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1 },
  compareBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  iconBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  summaryRow: { flexDirection: "row", gap: 10, paddingHorizontal: 16, marginBottom: 12 },
  summaryCard: { flex: 1, borderRadius: 14, borderWidth: 1, padding: 12, alignItems: "center" },
  sumCount: { fontSize: 20, fontFamily: "Inter_700Bold" },
  sumLabel: { fontSize: 11, fontFamily: "Inter_500Medium", marginTop: 2 },
  compareBanner: { flexDirection: "row", alignItems: "center", marginHorizontal: 16, marginBottom: 10, borderRadius: 12, borderWidth: 1, padding: 10, gap: 8 },
  compareBannerText: { flex: 1, fontSize: 12, fontFamily: "Inter_500Medium" },
  compareStartBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  compareStartText: { color: "#fff", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  errorBanner: { marginHorizontal: 16, marginBottom: 8, borderRadius: 10, padding: 10 },
  errorText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  list: { paddingHorizontal: 14, paddingTop: 4 },
  providerCard: { flexDirection: "row", alignItems: "flex-start", gap: 12, borderRadius: 18, borderWidth: 1, padding: 14 },
  selectCheck: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 13 },
  providerIcon: { width: 46, height: 46, borderRadius: 16, alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 },
  providerInfo: { flex: 1, gap: 4 },
  providerTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  displayName: { fontSize: 15, fontFamily: "Inter_600SemiBold", flex: 1 },
  latencyBadge: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  latencyText: { fontSize: 10, fontFamily: "Inter_500Medium" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  typeBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 7 },
  typeText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  apiBase: { fontSize: 11, fontFamily: "Inter_400Regular", flex: 1 },
  strengthRow: { flexDirection: "row", gap: 5 },
  strengthTag: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  strengthText: { fontSize: 10, fontFamily: "Inter_500Medium" },
  updatedAt: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  emptyWrap: { alignItems: "center", paddingTop: 80, gap: 10 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  searchWrap: { paddingHorizontal: 14, paddingBottom: 6 },
});
