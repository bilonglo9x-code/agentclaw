import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useVoices, Voice } from "@/hooks/useVoices";
import { SearchBar } from "@/components/SearchBar";

const PROVIDER_COLORS: Record<string, string> = {
  elevenlabs: "#f59e0b",
  openai: "#22c55e",
  minimax: "#60a5fa",
  google: "#4285f4",
  azure: "#0078d4",
  deepgram: "#a78bfa",
};

const MOCK_VOICES: Voice[] = [
  { id: "alloy", name: "Alloy", provider: "openai", language: "en", gender: "neutral" },
  { id: "echo", name: "Echo", provider: "openai", language: "en", gender: "male" },
  { id: "fable", name: "Fable", provider: "openai", language: "en", gender: "male" },
  { id: "onyx", name: "Onyx", provider: "openai", language: "en", gender: "male" },
  { id: "nova", name: "Nova", provider: "openai", language: "en", gender: "female" },
  { id: "shimmer", name: "Shimmer", provider: "openai", language: "en", gender: "female" },
  { id: "rachel", name: "Rachel", provider: "elevenlabs", language: "en", gender: "female", tags: ["conversational"] },
  { id: "adam", name: "Adam", provider: "elevenlabs", language: "en", gender: "male", tags: ["narrative"] },
  { id: "vi-female-1", name: "Vietnamese Female", provider: "minimax", language: "vi", gender: "female" },
  { id: "vi-male-1", name: "Vietnamese Male", provider: "minimax", language: "vi", gender: "male" },
];

export default function VoiceScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { voices: liveVoices, loading, error, refresh } = useVoices();
  const [search, setSearch] = useState("");
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [selectedVoice, setSelectedVoice] = useState<string | null>(null);
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const allVoices = liveVoices.length > 0 ? liveVoices : MOCK_VOICES;
  const providers = [...new Set(allVoices.map((v) => v.provider))];

  const filtered = allVoices.filter((v) => {
    if (selectedProvider && v.provider !== selectedProvider) return false;
    if (search && !v.name.toLowerCase().includes(search.toLowerCase()) && !v.language?.includes(search.toLowerCase())) return false;
    return true;
  });

  const renderVoice = ({ item }: { item: Voice }) => {
    const isSelected = selectedVoice === item.id;
    const provColor = PROVIDER_COLORS[item.provider] ?? colors.primary;

    return (
      <TouchableOpacity
        style={[styles.voiceRow, { backgroundColor: isSelected ? colors.primary + "10" : colors.card, borderColor: isSelected ? colors.primary + "50" : colors.border }]}
        onPress={() => setSelectedVoice(isSelected ? null : item.id)}
        activeOpacity={0.7}
      >
        <View style={[styles.voiceAvatar, { backgroundColor: provColor + "18" }]}>
          <Ionicons
            name={item.gender === "female" ? "woman-outline" : item.gender === "male" ? "man-outline" : "person-outline"}
            size={18}
            color={provColor}
          />
        </View>
        <View style={styles.voiceInfo}>
          <View style={styles.voiceNameRow}>
            <Text style={[styles.voiceName, { color: colors.foreground }]}>{item.name}</Text>
            {isSelected && <Ionicons name="checkmark-circle" size={16} color={colors.primary} />}
          </View>
          <View style={styles.voiceMeta}>
            <View style={[styles.provBadge, { backgroundColor: provColor + "18" }]}>
              <Text style={[styles.provText, { color: provColor }]}>{item.provider}</Text>
            </View>
            {item.language && (
              <View style={[styles.langBadge, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                <Text style={[styles.langText, { color: colors.mutedForeground }]}>{item.language.toUpperCase()}</Text>
              </View>
            )}
            {item.gender && (
              <Text style={[styles.genderText, { color: colors.mutedForeground }]}>{item.gender}</Text>
            )}
          </View>
          {item.tags && item.tags.length > 0 && (
            <View style={styles.tagsRow}>
              {item.tags.map((t) => (
                <View key={t} style={[styles.tag, { backgroundColor: colors.muted }]}>
                  <Text style={[styles.tagText, { color: colors.mutedForeground }]}>{t}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
        <TouchableOpacity
          style={[styles.previewBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
          activeOpacity={0.7}
        >
          <Ionicons name="play-outline" size={14} color={colors.mutedForeground} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 4 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.titleArea}>
          <Text style={[styles.title, { color: colors.foreground }]}>Voices</Text>
          <Text style={[styles.count, { color: colors.mutedForeground }]}>{allVoices.length} giọng</Text>
        </View>
        <TouchableOpacity onPress={refresh} style={[styles.iconBtn, { backgroundColor: colors.muted }]} activeOpacity={0.7}>
          {loading ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="refresh-outline" size={15} color={colors.mutedForeground} />}
        </TouchableOpacity>
      </View>

      <SearchBar value={search} onChangeText={setSearch} placeholder="Tìm giọng..." />

      {/* Provider filter */}
      <View style={styles.filterWrap}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={["Tất cả", ...providers]}
          keyExtractor={(p) => p}
          contentContainerStyle={styles.filterRow}
          renderItem={({ item: p }) => {
            const active = p === "Tất cả" ? !selectedProvider : selectedProvider === p;
            const pColor = PROVIDER_COLORS[p] ?? colors.primary;
            return (
              <TouchableOpacity
                onPress={() => setSelectedProvider(p === "Tất cả" ? null : p)}
                style={[styles.filterChip, { backgroundColor: active ? pColor + "20" : colors.muted, borderColor: active ? pColor + "50" : colors.border }]}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterText, { color: active ? pColor : colors.mutedForeground }]}>{p}</Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {selectedVoice && (
        <View style={[styles.selectedBanner, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "30" }]}>
          <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
          <Text style={[styles.selectedText, { color: colors.primary }]}>
            {allVoices.find((v) => v.id === selectedVoice)?.name} đã chọn làm giọng mặc định
          </Text>
          <TouchableOpacity onPress={() => setSelectedVoice(null)}>
            <Ionicons name="close" size={16} color={colors.primary} />
          </TouchableOpacity>
        </View>
      )}

      {error && (
        <View style={[styles.errorBanner, { backgroundColor: colors.destructive + "15" }]}>
          <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
        </View>
      )}

      <FlatList
        data={filtered}
        keyExtractor={(v) => v.id}
        renderItem={renderVoice}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="volume-mute-outline" size={36} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              {liveVoices.length === 0 ? "Chưa cấu hình TTS provider" : "Không tìm thấy giọng"}
            </Text>
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
  count: { fontSize: 12, fontFamily: "Inter_400Regular" },
  iconBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  filterWrap: {},
  filterRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 5, gap: 7 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  filterText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  selectedBanner: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 14, marginBottom: 4, borderRadius: 12, borderWidth: 1, padding: 10 },
  selectedText: { flex: 1, fontSize: 12, fontFamily: "Inter_500Medium" },
  errorBanner: { marginHorizontal: 14, marginBottom: 6, borderRadius: 10, padding: 10 },
  errorText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  list: { paddingHorizontal: 14, paddingTop: 6, gap: 8 },
  voiceRow: { flexDirection: "row", alignItems: "center", borderRadius: 14, borderWidth: 1, padding: 12, gap: 10 },
  voiceAvatar: { width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  voiceInfo: { flex: 1, gap: 5 },
  voiceNameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  voiceName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  voiceMeta: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  provBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  provText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  langBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 5, borderWidth: 1 },
  langText: { fontSize: 9, fontFamily: "Inter_700Bold" },
  genderText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  tagsRow: { flexDirection: "row", gap: 5, flexWrap: "wrap" },
  tag: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  tagText: { fontSize: 10, fontFamily: "Inter_400Regular" },
  previewBtn: { width: 32, height: 32, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  emptyWrap: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
});
