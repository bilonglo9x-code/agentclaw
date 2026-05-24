import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useTTSConfig, TTSProvider, TTSConfig } from "@/hooks/useTTSConfig";
import { useAuth } from "@/context/AuthContext";

const PROVIDER_CONFIG: Record<TTSProvider, { label: string; color: string; icon: keyof typeof Ionicons["glyphMap"] }> = {
  edge: { label: "Edge TTS", color: "#0078d4", icon: "logo-microsoft" },
  openai: { label: "OpenAI TTS", color: "#22c55e", icon: "cloud-outline" },
  elevenlabs: { label: "ElevenLabs", color: "#f59e0b", icon: "mic-outline" },
  gemini: { label: "Gemini TTS", color: "#4285f4", icon: "logo-google" },
  minimax: { label: "MiniMax", color: "#a78bfa", icon: "radio-outline" },
};

function FieldInput({ label, value, onChangeText, placeholder, masked = false, colors }: {
  label: string; value: string; onChangeText: (v: string) => void;
  placeholder?: string; masked?: boolean; colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={fi.wrap}>
      <Text style={[fi.label, { color: colors.mutedForeground }]}>{label}</Text>
      <TextInput
        style={[fi.input, { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.foreground }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ?? label}
        placeholderTextColor={colors.mutedForeground}
        secureTextEntry={masked}
        autoCapitalize="none"
        autoCorrect={false}
      />
    </View>
  );
}

const fi = StyleSheet.create({
  wrap: { gap: 5 },
  label: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.4 },
  input: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 13, paddingVertical: 11, fontSize: 13, fontFamily: "Inter_400Regular" },
});

export default function TTSConfigScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { connected, http } = useAuth();
  const { config, loading, saving, error, load, saveConfig } = useTTSConfig();
  const topPad = insets.top;

  const [draft, setDraft] = useState<TTSConfig>({ provider: "edge", auto: true, mode: "auto" });
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (config) {
      setDraft(config);
      setDirty(false);
    }
  }, [config]);

  const update = (patch: Partial<TTSConfig>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
    setDirty(true);
  };

  const updateProvider = (provKey: TTSProvider, patch: Record<string, string>) => {
    setDraft((prev) => ({
      ...prev,
      [provKey]: { ...(prev[provKey] ?? {}), ...patch },
    }));
    setDirty(true);
  };

  const handleSave = async () => {
    try {
      await saveConfig(draft);
      setDirty(false);
      Alert.alert("Thành công", "TTS Config đã được lưu");
    } catch (e) {
      Alert.alert("Lỗi", e instanceof Error ? e.message : "Lưu thất bại");
    }
  };

  const [testing, setTesting] = useState(false);
  const handleTestConnection = async () => {
    if (!connected) {
      Alert.alert("Chưa kết nối", "Cần kết nối đến server để test TTS");
      return;
    }
    setTesting(true);
    try {
      await http?.post("/v1/tts/test", { provider: draft.provider, text: "Xin chào, đây là bài kiểm tra TTS." });
      Alert.alert("Thành công", `Provider ${PROVIDER_CONFIG[draft.provider]?.label} hoạt động bình thường`);
    } catch (e) {
      Alert.alert("Lỗi kết nối", e instanceof Error ? e.message : "Kiểm tra TTS thất bại");
    } finally {
      setTesting(false);
    }
  };

  const selectedProv = draft.provider;
  const provConfig = PROVIDER_CONFIG[selectedProv] ?? PROVIDER_CONFIG.edge;
  const provSettings = (draft[selectedProv] ?? {}) as Record<string, string>;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 4 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>TTS Config</Text>
        <TouchableOpacity
          onPress={handleTestConnection}
          disabled={testing}
          style={[styles.testBtn, { backgroundColor: "#22c55e18", borderColor: "#22c55e35" }]}
          activeOpacity={0.7}
        >
          {testing ? (
            <ActivityIndicator size="small" color="#22c55e" />
          ) : (
            <>
              <Ionicons name="play-circle-outline" size={14} color="#22c55e" />
              <Text style={[styles.testBtnText, { color: "#22c55e" }]}>Test</Text>
            </>
          )}
        </TouchableOpacity>
        <TouchableOpacity onPress={load} style={[styles.iconBtn, { backgroundColor: colors.muted }]} activeOpacity={0.7}>
          {loading ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="refresh-outline" size={15} color={colors.mutedForeground} />}
        </TouchableOpacity>
      </View>

      {!connected && (
        <View style={[styles.banner, { backgroundColor: "#f59e0b15", borderColor: "#f59e0b30" }]}>
          <Ionicons name="warning-outline" size={14} color="#f59e0b" />
          <Text style={[styles.bannerText, { color: "#f59e0b" }]}>Chưa kết nối — cần server để lưu config</Text>
        </View>
      )}

      {error && (
        <View style={[styles.banner, { backgroundColor: colors.destructive + "15", borderColor: colors.destructive + "30" }]}>
          <Text style={[styles.bannerText, { color: colors.destructive }]}>{error}</Text>
        </View>
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Provider selector */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Provider</Text>
          <View style={styles.providerGrid}>
            {Object.entries(PROVIDER_CONFIG).map(([key, cfg]) => {
              const selected = draft.provider === key;
              return (
                <TouchableOpacity
                  key={key}
                  onPress={() => update({ provider: key as TTSProvider })}
                  style={[styles.providerBtn, {
                    backgroundColor: selected ? cfg.color + "20" : colors.secondary,
                    borderColor: selected ? cfg.color + "60" : colors.border,
                  }]}
                  activeOpacity={0.7}
                >
                  <Ionicons name={cfg.icon} size={16} color={selected ? cfg.color : colors.mutedForeground} />
                  <Text style={[styles.providerLabel, { color: selected ? cfg.color : colors.mutedForeground }]}>{cfg.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* General settings */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Cài đặt chung</Text>
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={[styles.toggleLabel, { color: colors.foreground }]}>Auto mode</Text>
              <Text style={[styles.toggleDesc, { color: colors.mutedForeground }]}>Tự động chọn TTS theo ngữ cảnh</Text>
            </View>
            <Switch
              value={draft.auto ?? true}
              onValueChange={(v) => update({ auto: v })}
              trackColor={{ true: colors.primary, false: colors.muted }}
              thumbColor="#fff"
            />
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={fi.wrap}>
            <Text style={[fi.label, { color: colors.mutedForeground }]}>Max length</Text>
            <TextInput
              style={[fi.input, { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.foreground }]}
              value={String(draft.max_length ?? "")}
              onChangeText={(v) => update({ max_length: parseInt(v) || undefined })}
              placeholder="Độ dài tối đa (ký tự)"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="numeric"
            />
          </View>
          <View style={fi.wrap}>
            <Text style={[fi.label, { color: colors.mutedForeground }]}>Timeout (ms)</Text>
            <TextInput
              style={[fi.input, { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.foreground }]}
              value={String(draft.timeout_ms ?? "")}
              onChangeText={(v) => update({ timeout_ms: parseInt(v) || undefined })}
              placeholder="Timeout ms"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Provider-specific settings */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.provIcon, { backgroundColor: provConfig.color + "20" }]}>
              <Ionicons name={provConfig.icon} size={14} color={provConfig.color} />
            </View>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{provConfig.label}</Text>
          </View>

          {selectedProv !== "edge" && (
            <FieldInput
              label="API Key"
              value={provSettings.api_key ?? ""}
              onChangeText={(v) => updateProvider(selectedProv, { api_key: v })}
              placeholder="sk-... (masked)"
              masked
              colors={colors}
            />
          )}

          {(selectedProv === "openai" || selectedProv === "elevenlabs") && (
            <FieldInput
              label="API Base URL"
              value={provSettings.api_base ?? ""}
              onChangeText={(v) => updateProvider(selectedProv, { api_base: v })}
              placeholder="https://api.openai.com/v1"
              colors={colors}
            />
          )}

          <FieldInput
            label="Voice ID"
            value={provSettings.voice_id ?? ""}
            onChangeText={(v) => updateProvider(selectedProv, { voice_id: v })}
            placeholder="alloy / en-US-JennyNeural / ..."
            colors={colors}
          />

          {selectedProv !== "edge" && (
            <FieldInput
              label="Model ID"
              value={provSettings.model_id ?? ""}
              onChangeText={(v) => updateProvider(selectedProv, { model_id: v })}
              placeholder="tts-1 / eleven_multilingual_v2 / ..."
              colors={colors}
            />
          )}
        </View>
      </ScrollView>

      {dirty && (
        <View style={[styles.saveBar, { backgroundColor: colors.card, borderColor: colors.border, paddingBottom: insets.bottom + 10 }]}>
          <TouchableOpacity
            onPress={handleSave}
            style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: saving ? 0.7 : 1 }]}
            disabled={saving || !connected}
            activeOpacity={0.7}
          >
            {saving ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="save-outline" size={16} color="#fff" />}
            <Text style={styles.saveBtnText}>Lưu Config</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingBottom: 10, gap: 8 },
  backBtn: { padding: 4 },
  title: { flex: 1, fontSize: 20, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  iconBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  banner: { marginHorizontal: 16, marginBottom: 8, borderRadius: 10, borderWidth: 1, padding: 10, flexDirection: "row", alignItems: "center", gap: 6 },
  bannerText: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 4, gap: 14 },
  section: { borderRadius: 18, borderWidth: 1, padding: 16, gap: 12 },
  sectionHeaderRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  provIcon: { width: 26, height: 26, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  providerGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  providerBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 12, borderWidth: 1 },
  providerLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  toggleInfo: { flex: 1 },
  toggleLabel: { fontSize: 14, fontFamily: "Inter_500Medium" },
  toggleDesc: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  divider: { height: StyleSheet.hairlineWidth },
  saveBar: { paddingHorizontal: 16, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  saveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 14, paddingVertical: 13 },
  saveBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  testBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1, height: 32 },
  testBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
});
