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
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useModels, ModelInfo } from "@/hooks/useModels";
import { useAuth } from "@/context/AuthContext";

const MOCK_MODELS: ModelInfo[] = [
  { name: "claude-3-5-sonnet-20241022", provider: "anthropic", display_name: "Claude 3.5 Sonnet", context_window: 200000, max_output_tokens: 8192, capabilities: ["text", "image", "thinking"], enabled: true, is_default: true },
  { name: "claude-3-5-haiku-20241022", provider: "anthropic", display_name: "Claude 3.5 Haiku", context_window: 200000, max_output_tokens: 8192, capabilities: ["text", "image"], enabled: true },
  { name: "claude-3-opus-20240229", provider: "anthropic", display_name: "Claude 3 Opus", context_window: 200000, max_output_tokens: 4096, capabilities: ["text", "image"], enabled: true },
  { name: "gpt-4o", provider: "openai", display_name: "GPT-4o", context_window: 128000, max_output_tokens: 16384, capabilities: ["text", "image"], enabled: true },
  { name: "gpt-4o-mini", provider: "openai", display_name: "GPT-4o Mini", context_window: 128000, max_output_tokens: 16384, capabilities: ["text", "image"], enabled: true },
  { name: "gpt-4-turbo", provider: "openai", display_name: "GPT-4 Turbo", context_window: 128000, max_output_tokens: 4096, capabilities: ["text", "image"], enabled: false },
  { name: "gemini-2.0-flash", provider: "google", display_name: "Gemini 2.0 Flash", context_window: 1000000, max_output_tokens: 8192, capabilities: ["text", "image"], enabled: true },
  { name: "gemini-1.5-pro", provider: "google", display_name: "Gemini 1.5 Pro", context_window: 2000000, max_output_tokens: 8192, capabilities: ["text", "image", "embedding"], enabled: true },
  { name: "deepseek-chat", provider: "deepseek", display_name: "DeepSeek Chat", context_window: 64000, max_output_tokens: 4096, capabilities: ["text"], enabled: true },
  { name: "deepseek-reasoner", provider: "deepseek", display_name: "DeepSeek Reasoner", context_window: 64000, max_output_tokens: 8000, capabilities: ["text", "thinking"], enabled: true },
  { name: "llama-3.3-70b-versatile", provider: "groq", display_name: "Llama 3.3 70B", context_window: 128000, max_output_tokens: 8192, capabilities: ["text"], enabled: true },
  { name: "text-embedding-3-small", provider: "openai", display_name: "Embedding 3 Small", context_window: 8191, capabilities: ["embedding"], enabled: true },
];

const PROVIDER_COLORS: Record<string, string> = {
  anthropic: "#d97706",
  openai: "#22c55e",
  google: "#3b82f6",
  deepseek: "#a78bfa",
  groq: "#f97316",
  openrouter: "#e879f9",
  xai: "#64748b",
  mistral: "#06b6d4",
};

const CAP_CONFIG: Record<string, { icon: keyof typeof Ionicons["glyphMap"]; color: string; label: string }> = {
  text: { icon: "chatbubble-outline", color: "#60a5fa", label: "Text" },
  image: { icon: "image-outline", color: "#a78bfa", label: "Image" },
  thinking: { icon: "sparkles-outline", color: "#f59e0b", label: "Thinking" },
  embedding: { icon: "git-merge-outline", color: "#22c55e", label: "Embed" },
  audio: { icon: "mic-outline", color: "#f97316", label: "Audio" },
  video: { icon: "videocam-outline", color: "#e879f9", label: "Video" },
};

function fmtCtx(n?: number): string {
  if (!n) return "—";
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${Math.round(n / 1000)}K`;
  return String(n);
}

function ModelCard({ item, colors }: { item: ModelInfo; colors: ReturnType<typeof useColors> }) {
  const provColor = PROVIDER_COLORS[item.provider] ?? "#a1a1aa";
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.cardTop}>
        <View style={[styles.providerBadge, { backgroundColor: provColor + "20", borderColor: provColor + "40" }]}>
          <Text style={[styles.providerText, { color: provColor }]}>{item.provider}</Text>
        </View>
        <View style={styles.cardMeta}>
          {item.is_default && (
            <View style={[styles.defaultBadge, { backgroundColor: colors.primary + "20", borderColor: colors.primary + "40" }]}>
              <Text style={[styles.defaultText, { color: colors.primary }]}>default</Text>
            </View>
          )}
          {!item.enabled && (
            <View style={[styles.disabledBadge, { backgroundColor: colors.muted }]}>
              <Text style={[styles.disabledText, { color: colors.mutedForeground }]}>disabled</Text>
            </View>
          )}
        </View>
      </View>

      <Text style={[styles.modelName, { color: colors.foreground }]} numberOfLines={1}>
        {item.display_name ?? item.name}
      </Text>
      {item.display_name && (
        <Text style={[styles.modelKey, { color: colors.mutedForeground }]} numberOfLines={1}>
          {item.name}
        </Text>
      )}

      <View style={styles.statsRow}>
        <View style={styles.statPair}>
          <Ionicons name="layers-outline" size={11} color={colors.mutedForeground} />
          <Text style={[styles.statVal, { color: colors.foreground }]}>{fmtCtx(item.context_window)}</Text>
          <Text style={[styles.statLbl, { color: colors.mutedForeground }]}>ctx</Text>
        </View>
        {item.max_output_tokens && (
          <View style={styles.statPair}>
            <Ionicons name="arrow-up-outline" size={11} color={colors.mutedForeground} />
            <Text style={[styles.statVal, { color: colors.foreground }]}>{fmtCtx(item.max_output_tokens)}</Text>
            <Text style={[styles.statLbl, { color: colors.mutedForeground }]}>out</Text>
          </View>
        )}
      </View>

      {(item.capabilities ?? []).length > 0 && (
        <View style={styles.capsRow}>
          {(item.capabilities ?? []).map((cap) => {
            const cfg = CAP_CONFIG[cap];
            if (!cfg) return null;
            return (
              <View key={cap} style={[styles.capChip, { backgroundColor: cfg.color + "15", borderColor: cfg.color + "30" }]}>
                <Ionicons name={cfg.icon} size={10} color={cfg.color} />
                <Text style={[styles.capText, { color: cfg.color }]}>{cfg.label}</Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

export default function ModelsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { connected } = useAuth();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { models: liveModels, loading, error, refresh } = useModels();
  const baseModels = connected && liveModels.length > 0 ? liveModels : MOCK_MODELS;

  const [provFilter, setProvFilter] = useState<string | null>(null);
  const [capFilter, setCapFilter] = useState<string | null>(null);

  const providers = useMemo(() => {
    const set = new Set(baseModels.map((m) => m.provider));
    return Array.from(set).sort();
  }, [baseModels]);

  const filtered = useMemo(() => {
    return baseModels.filter((m) => {
      if (provFilter && m.provider !== provFilter) return false;
      if (capFilter && !(m.capabilities ?? []).includes(capFilter)) return false;
      return true;
    });
  }, [baseModels, provFilter, capFilter]);

  const totalEnabled = baseModels.filter((m) => m.enabled !== false).length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 4 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.titleArea}>
          <Text style={[styles.title, { color: colors.foreground }]}>Models</Text>
          <Text style={[styles.badge, { color: colors.mutedForeground }]}>{baseModels.length}</Text>
        </View>
        <TouchableOpacity onPress={refresh} style={[styles.iconBtn, { backgroundColor: colors.muted }]} activeOpacity={0.7}>
          {loading ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="refresh-outline" size={15} color={colors.mutedForeground} />}
        </TouchableOpacity>
      </View>

      {/* Summary */}
      <View style={styles.summaryRow}>
        <View style={[styles.sumCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sumCount, { color: colors.primary }]}>{baseModels.length}</Text>
          <Text style={[styles.sumLabel, { color: colors.mutedForeground }]}>Total</Text>
        </View>
        <View style={[styles.sumCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sumCount, { color: "#22c55e" }]}>{totalEnabled}</Text>
          <Text style={[styles.sumLabel, { color: colors.mutedForeground }]}>Enabled</Text>
        </View>
        <View style={[styles.sumCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sumCount, { color: "#60a5fa" }]}>{providers.length}</Text>
          <Text style={[styles.sumLabel, { color: colors.mutedForeground }]}>Providers</Text>
        </View>
      </View>

      {/* Provider filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterRow}>
        <TouchableOpacity
          onPress={() => setProvFilter(null)}
          style={[styles.chip, { backgroundColor: !provFilter ? colors.primary + "22" : colors.muted, borderColor: !provFilter ? colors.primary + "55" : colors.border }]}
          activeOpacity={0.7}
        >
          <Text style={[styles.chipText, { color: !provFilter ? colors.primary : colors.mutedForeground }]}>Tất cả</Text>
        </TouchableOpacity>
        {providers.map((p) => {
          const active = provFilter === p;
          const col = PROVIDER_COLORS[p] ?? "#a1a1aa";
          return (
            <TouchableOpacity
              key={p}
              onPress={() => setProvFilter(active ? null : p)}
              style={[styles.chip, { backgroundColor: active ? col + "22" : colors.muted, borderColor: active ? col + "55" : colors.border }]}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, { color: active ? col : colors.mutedForeground }]}>{p}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Capability filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterRow}>
        {[null, "text", "image", "thinking", "embedding"].map((cap) => {
          const active = capFilter === cap;
          const cfg = cap ? CAP_CONFIG[cap] : null;
          return (
            <TouchableOpacity
              key={cap ?? "all"}
              onPress={() => setCapFilter(cap)}
              style={[styles.chip, { backgroundColor: active ? (cfg?.color ?? colors.primary) + "22" : colors.muted, borderColor: active ? (cfg?.color ?? colors.primary) + "55" : colors.border }]}
              activeOpacity={0.7}
            >
              {cfg && <Ionicons name={cfg.icon} size={11} color={active ? cfg.color : colors.mutedForeground} />}
              <Text style={[styles.chipText, { color: active ? (cfg?.color ?? colors.primary) : colors.mutedForeground }]}>
                {cap ? CAP_CONFIG[cap]?.label : "Tất cả"}
              </Text>
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
        data={filtered}
        keyExtractor={(m) => `${m.provider}/${m.name}`}
        renderItem={({ item }) => <ModelCard item={item} colors={colors} />}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 40 }]}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="cube-outline" size={36} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Không có models</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingBottom: 8, gap: 8 },
  backBtn: { padding: 4 },
  titleArea: { flex: 1, flexDirection: "row", alignItems: "baseline", gap: 8 },
  title: { fontSize: 20, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  badge: { fontSize: 12, fontFamily: "Inter_400Regular" },
  iconBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  summaryRow: { flexDirection: "row", gap: 10, paddingHorizontal: 16, marginBottom: 10 },
  sumCard: { flex: 1, borderRadius: 14, borderWidth: 1, padding: 12, alignItems: "center" },
  sumCount: { fontSize: 20, fontFamily: "Inter_700Bold" },
  sumLabel: { fontSize: 11, fontFamily: "Inter_500Medium", marginTop: 2 },
  filterScroll: { flexGrow: 0, flexShrink: 0 },
  filterRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 5, gap: 7 },
  chip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 11, paddingVertical: 5, borderRadius: 20, borderWidth: 1, alignSelf: "flex-start" },
  chipText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  errorBanner: { marginHorizontal: 16, marginBottom: 6, borderRadius: 10, padding: 10 },
  errorText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  list: { paddingHorizontal: 14, paddingTop: 8 },
  card: { borderRadius: 18, borderWidth: 1, padding: 14, gap: 6 },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  providerBadge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 8, borderWidth: 1, alignSelf: "flex-start" },
  providerText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  cardMeta: { flexDirection: "row", gap: 5 },
  defaultBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
  defaultText: { fontSize: 9, fontFamily: "Inter_600SemiBold" },
  disabledBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  disabledText: { fontSize: 9, fontFamily: "Inter_500Medium" },
  modelName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  modelKey: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: -2 },
  statsRow: { flexDirection: "row", gap: 14, marginTop: 2 },
  statPair: { flexDirection: "row", alignItems: "center", gap: 4 },
  statVal: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  statLbl: { fontSize: 10, fontFamily: "Inter_400Regular" },
  capsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 2 },
  capChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  capText: { fontSize: 10, fontFamily: "Inter_500Medium" },
  emptyWrap: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
});
