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
import { useProviders, ProviderData } from "@/hooks/useProviders";

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

const MOCK_PROVIDERS: ProviderData[] = [
  { id: "p1", name: "openai_main", display_name: "OpenAI", provider_type: "openai", api_base: "https://api.openai.com/v1", enabled: true, created_at: new Date(Date.now() - 86400000 * 60).toISOString(), updated_at: new Date().toISOString() },
  { id: "p2", name: "anthropic_main", display_name: "Anthropic", provider_type: "anthropic", enabled: true, created_at: new Date(Date.now() - 86400000 * 30).toISOString(), updated_at: new Date().toISOString() },
  { id: "p3", name: "gemini_flash", display_name: "Google Gemini", provider_type: "gemini", enabled: true, created_at: new Date(Date.now() - 86400000 * 15).toISOString(), updated_at: new Date().toISOString() },
  { id: "p4", name: "ollama_local", display_name: "Ollama (Local)", provider_type: "ollama", api_base: "http://localhost:11434/v1", enabled: false, created_at: new Date(Date.now() - 86400000 * 5).toISOString(), updated_at: new Date().toISOString() },
  { id: "p5", name: "groq_fast", display_name: "Groq", provider_type: "groq", enabled: true, created_at: new Date(Date.now() - 86400000 * 2).toISOString(), updated_at: new Date().toISOString() },
];

function fmtTime(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m trước`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h trước`;
  return `${Math.floor(diff / 86400000)}d trước`;
}

export default function ProvidersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { providers: liveProviders, loading, error, toggle, refresh } = useProviders();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const providers = liveProviders.length > 0 ? liveProviders : MOCK_PROVIDERS;
  const enabledCount = providers.filter((p) => p.enabled).length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 4 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>Providers</Text>
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
          <Text style={[styles.sumCount, { color: colors.foreground }]}>{providers.length}</Text>
          <Text style={[styles.sumLabel, { color: colors.mutedForeground }]}>Total</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sumCount, { color: colors.mutedForeground }]}>{providers.length - enabledCount}</Text>
          <Text style={[styles.sumLabel, { color: colors.mutedForeground }]}>Disabled</Text>
        </View>
      </View>

      {error && (
        <View style={[styles.errorBanner, { backgroundColor: colors.destructive + "15" }]}>
          <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
        </View>
      )}

      <FlatList
        data={providers}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => {
          const cfg = PROVIDER_ICONS[item.provider_type] ?? { color: colors.primary, icon: "server-outline" as const };
          return (
            <View style={[styles.providerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.providerIcon, { backgroundColor: cfg.color + "20" }]}>
                <Ionicons name={cfg.icon} size={22} color={cfg.color} />
              </View>
              <View style={styles.providerInfo}>
                <Text style={[styles.displayName, { color: colors.foreground }]}>{item.display_name}</Text>
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
                <Text style={[styles.updatedAt, { color: colors.mutedForeground }]}>
                  Updated {fmtTime(item.updated_at)}
                </Text>
              </View>
              <Switch
                value={item.enabled}
                onValueChange={(v) => toggle(item.id, v)}
                trackColor={{ true: colors.primary, false: colors.muted }}
                thumbColor="#fff"
                ios_backgroundColor={colors.muted}
              />
            </View>
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
  providerCard: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 18, borderWidth: 1, padding: 14 },
  providerIcon: { width: 46, height: 46, borderRadius: 16, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  providerInfo: { flex: 1, gap: 4 },
  displayName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  typeBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 7 },
  typeText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  apiBase: { fontSize: 11, fontFamily: "Inter_400Regular", flex: 1 },
  updatedAt: { fontSize: 11, fontFamily: "Inter_400Regular" },
  emptyWrap: { alignItems: "center", paddingTop: 80, gap: 10 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
});
