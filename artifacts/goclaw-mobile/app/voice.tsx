import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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

type GenderFilter = "all" | "female" | "male" | "neutral";

const GENDER_CONFIG: Record<GenderFilter, { icon: keyof typeof Ionicons["glyphMap"]; label: string; color: string }> = {
  all: { icon: "people-outline", label: "Tất cả", color: "#a1a1aa" },
  female: { icon: "woman-outline", label: "Female", color: "#ec4899" },
  male: { icon: "man-outline", label: "Male", color: "#60a5fa" },
  neutral: { icon: "person-outline", label: "Neutral", color: "#a78bfa" },
};

export default function VoiceScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { voices: liveVoices, loading, error, refresh, synthesize } = useVoices();
  const [search, setSearch] = useState("");
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [genderFilter, setGenderFilter] = useState<GenderFilter>("all");
  const [selectedVoice, setSelectedVoice] = useState<string | null>(null);
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const [demoText, setDemoText] = useState("Xin chào! Đây là bản thử giọng nói.");
  const [showDemo, setShowDemo] = useState(false);
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const allVoices = liveVoices.length > 0 ? liveVoices : MOCK_VOICES;
  const providers = [...new Set(allVoices.map((v) => v.provider))];

  const filtered = allVoices.filter((v) => {
    if (selectedProvider && v.provider !== selectedProvider) return false;
    if (genderFilter !== "all" && v.gender !== genderFilter) return false;
    if (search && !v.name.toLowerCase().includes(search.toLowerCase()) && !v.language?.includes(search.toLowerCase())) return false;
    return true;
  });

  const handlePreview = async (voiceId: string) => {
    if (playingVoice === voiceId) {
      setPlayingVoice(null);
      return;
    }
    setPlayingVoice(voiceId);
    try {
      await synthesize(voiceId, demoText);
    } finally {
      setPlayingVoice(null);
    }
  };

  const renderVoice = ({ item }: { item: Voice }) => {
    const isSelected = selectedVoice === item.id;
    const isPlaying = playingVoice === item.id;
    const provColor = PROVIDER_COLORS[item.provider] ?? colors.primary;
    const genderCfg = GENDER_CONFIG[item.gender as GenderFilter] ?? GENDER_CONFIG.neutral;

    return (
      <TouchableOpacity
        style={[styles.voiceRow, { backgroundColor: isSelected ? colors.primary + "10" : colors.card, borderColor: isSelected ? colors.primary + "50" : colors.border }]}
        onPress={() => setSelectedVoice(isSelected ? null : item.id)}
        activeOpacity={0.7}
      >
        <View style={[styles.voiceAvatar, { backgroundColor: provColor + "18" }]}>
          <Ionicons name={genderCfg.icon} size={18} color={provColor} />
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
              <View style={[styles.genderBadge, { backgroundColor: genderCfg.color + "15" }]}>
                <Text style={[styles.genderText, { color: genderCfg.color }]}>{item.gender}</Text>
              </View>
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
          style={[styles.previewBtn, {
            backgroundColor: isPlaying ? colors.primary + "20" : colors.secondary,
            borderColor: isPlaying ? colors.primary + "50" : colors.border,
          }]}
          onPress={() => handlePreview(item.id)}
          activeOpacity={0.7}
        >
          {isPlaying ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons name="play-outline" size={14} color={colors.mutedForeground} />
          )}
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
        <TouchableOpacity
          onPress={() => router.push("/tts-config")}
          style={[styles.iconBtn, { backgroundColor: colors.muted }]}
          activeOpacity={0.7}
        >
          <Ionicons name="settings-outline" size={15} color={colors.mutedForeground} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setShowDemo(!showDemo)}
          style={[styles.iconBtn, { backgroundColor: showDemo ? colors.primary + "20" : colors.muted }]}
          activeOpacity={0.7}
        >
          <Ionicons name="mic-outline" size={15} color={showDemo ? colors.primary : colors.mutedForeground} />
        </TouchableOpacity>
        <TouchableOpacity onPress={refresh} style={[styles.iconBtn, { backgroundColor: colors.muted }]} activeOpacity={0.7}>
          {loading ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="refresh-outline" size={15} color={colors.mutedForeground} />}
        </TouchableOpacity>
      </View>

      {/* TTS demo input */}
      {showDemo && (
        <View style={[styles.demoBox, { backgroundColor: colors.card, borderColor: colors.primary + "30" }]}>
          <View style={styles.demoLabelRow}>
            <Ionicons name="mic-outline" size={13} color={colors.primary} />
            <Text style={[styles.demoLabel, { color: colors.primary }]}>VĂN BẢN THỬ GIỌNG</Text>
            {selectedVoice && (
              <Text style={[styles.demoVoice, { color: colors.mutedForeground }]}>
                · {allVoices.find((v) => v.id === selectedVoice)?.name ?? selectedVoice}
              </Text>
            )}
          </View>
          <TextInput
            value={demoText}
            onChangeText={setDemoText}
            style={[styles.demoInput, { color: colors.foreground, borderColor: colors.border }]}
            placeholder="Nhập văn bản..."
            placeholderTextColor={colors.mutedForeground}
            multiline
          />
        </View>
      )}

      <SearchBar value={search} onChangeText={setSearch} placeholder="Tìm giọng..." />

      {/* Provider filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterRow}>
        {["Tất cả", ...providers].map((p) => {
          const active = p === "Tất cả" ? !selectedProvider : selectedProvider === p;
          const pColor = PROVIDER_COLORS[p] ?? colors.primary;
          return (
            <TouchableOpacity
              key={p}
              onPress={() => setSelectedProvider(p === "Tất cả" ? null : p)}
              style={[styles.filterChip, { backgroundColor: active ? pColor + "20" : colors.muted, borderColor: active ? pColor + "50" : colors.border }]}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterText, { color: active ? pColor : colors.mutedForeground }]}>{p}</Text>
            </TouchableOpacity>
          );
        })}
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        {(["all", "female", "male", "neutral"] as GenderFilter[]).map((g) => {
          const active = genderFilter === g;
          const cfg = GENDER_CONFIG[g];
          return (
            <TouchableOpacity
              key={g}
              onPress={() => setGenderFilter(g)}
              style={[styles.filterChip, { backgroundColor: active ? cfg.color + "20" : colors.muted, borderColor: active ? cfg.color + "50" : colors.border }]}
              activeOpacity={0.7}
            >
              <Ionicons name={cfg.icon} size={11} color={active ? cfg.color : colors.mutedForeground} />
              <Text style={[styles.filterText, { color: active ? cfg.color : colors.mutedForeground }]}>{cfg.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

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
  demoBox: { marginHorizontal: 14, marginBottom: 6, borderRadius: 14, borderWidth: 1, padding: 12, gap: 8 },
  demoLabelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  demoLabel: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  demoVoice: { fontSize: 10, fontFamily: "Inter_400Regular" },
  demoInput: { borderWidth: 1, borderRadius: 10, padding: 8, fontSize: 13, fontFamily: "Inter_400Regular", minHeight: 52 },
  filterScroll: { flexGrow: 0, flexShrink: 0 },
  filterRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 5, gap: 7 },
  filterChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1, alignSelf: "flex-start" },
  filterText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  divider: { width: 1, height: 18, marginHorizontal: 2 },
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
  genderBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 5 },
  genderText: { fontSize: 9, fontFamily: "Inter_600SemiBold" },
  tagsRow: { flexDirection: "row", gap: 5, flexWrap: "wrap" },
  tag: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  tagText: { fontSize: 10, fontFamily: "Inter_400Regular" },
  previewBtn: { width: 34, height: 34, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  emptyWrap: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
});
