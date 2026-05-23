import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { useConfig } from "@/hooks/useConfig";
import { useAuth } from "@/context/AuthContext";

export default function ConfigScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { connected } = useAuth();
  const { config, loading, applying, error, load, applyConfig, patchConfig } = useConfig();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [editRaw, setEditRaw] = useState("");
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [lastResult, setLastResult] = useState<{ restart?: boolean; hash?: string } | null>(null);

  useEffect(() => {
    if (config?.raw) {
      setEditRaw(config.raw as string);
    } else if (config) {
      setEditRaw(JSON.stringify(config, null, 2));
    }
  }, [config]);

  const handleApply = async (isPatch: boolean) => {
    if (!editRaw.trim()) return;
    try {
      const res = isPatch
        ? await patchConfig(editRaw, config?.hash as string | undefined)
        : await applyConfig(editRaw, config?.hash as string | undefined);
      setLastResult({ restart: res.restart, hash: res.hash });
      setMode("view");
      if (res.restart) {
        Alert.alert(
          "Cần khởi động lại",
          "Config đã được apply. Server cần restart để áp dụng thay đổi.",
          [{ text: "OK" }],
        );
      }
    } catch (e) {
      Alert.alert("Lỗi", e instanceof Error ? e.message : "Apply thất bại");
    }
  };

  const configJson = config
    ? JSON.stringify(
        Object.fromEntries(
          Object.entries(config).filter(([k]) => !["hash", "path", "raw"].includes(k))
        ),
        null,
        2,
      )
    : "";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 4 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>System Config</Text>
        <TouchableOpacity
          onPress={load}
          style={[styles.iconBtn, { backgroundColor: colors.muted }]}
          activeOpacity={0.7}
        >
          {loading
            ? <ActivityIndicator size="small" color={colors.primary} />
            : <Ionicons name="refresh-outline" size={15} color={colors.mutedForeground} />}
        </TouchableOpacity>
        {mode === "view" ? (
          <TouchableOpacity
            onPress={() => setMode("edit")}
            style={[styles.iconBtn, { backgroundColor: colors.primary + "20" }]}
            activeOpacity={0.7}
          >
            <Ionicons name="create-outline" size={15} color={colors.primary} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={() => setMode("view")}
            style={[styles.iconBtn, { backgroundColor: colors.muted }]}
            activeOpacity={0.7}
          >
            <Ionicons name="close-outline" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}
      </View>

      {!connected && (
        <View style={[styles.banner, { backgroundColor: "#f59e0b15", borderColor: "#f59e0b30" }]}>
          <Ionicons name="warning-outline" size={14} color="#f59e0b" />
          <Text style={[styles.bannerText, { color: "#f59e0b" }]}>Chưa kết nối — cần server để đọc config</Text>
        </View>
      )}

      {error && (
        <View style={[styles.banner, { backgroundColor: colors.destructive + "15", borderColor: colors.destructive + "30" }]}>
          <Ionicons name="alert-circle-outline" size={14} color={colors.destructive} />
          <Text style={[styles.bannerText, { color: colors.destructive }]}>{error}</Text>
        </View>
      )}

      {lastResult && (
        <View style={[styles.banner, { backgroundColor: "#22c55e15", borderColor: "#22c55e30" }]}>
          <Ionicons name="checkmark-circle-outline" size={14} color="#22c55e" />
          <Text style={[styles.bannerText, { color: "#22c55e" }]}>
            Apply thành công{lastResult.restart ? " — cần restart server" : ""}
            {lastResult.hash ? ` (hash: ${lastResult.hash.slice(0, 8)})` : ""}
          </Text>
        </View>
      )}

      {/* Meta info */}
      {config && (
        <View style={styles.metaRow}>
          {config.path ? (
            <View style={[styles.metaChip, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="document-outline" size={11} color={colors.mutedForeground} />
              <Text style={[styles.metaText, { color: colors.mutedForeground }]} numberOfLines={1}>
                {config.path as string}
              </Text>
            </View>
          ) : null}
          {config.hash ? (
            <View style={[styles.metaChip, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="finger-print-outline" size={11} color={colors.mutedForeground} />
              <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                {(config.hash as string).slice(0, 12)}
              </Text>
            </View>
          ) : null}
        </View>
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {loading && !config ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Đang tải config...</Text>
          </View>
        ) : mode === "view" ? (
          <View style={[styles.codeBlock, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.codeText, { color: colors.foreground }]}>
              {configJson || "Chưa có config"}
            </Text>
          </View>
        ) : (
          <View>
            <View style={[styles.editHintRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="information-circle-outline" size={14} color={colors.mutedForeground} />
              <Text style={[styles.editHint, { color: colors.mutedForeground }]}>
                Chỉnh sửa JSON5 config. Patch = merge, Apply = thay thế toàn bộ.
              </Text>
            </View>
            <TextInput
              style={[styles.editor, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
              value={editRaw}
              onChangeText={setEditRaw}
              multiline
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              placeholder="Nhập JSON5 config..."
              placeholderTextColor={colors.mutedForeground}
              scrollEnabled={false}
            />
          </View>
        )}
      </ScrollView>

      {mode === "edit" && (
        <View style={[styles.actionBar, { backgroundColor: colors.card, borderColor: colors.border, paddingBottom: insets.bottom + 10 }]}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
            onPress={() => handleApply(true)}
            disabled={applying}
            activeOpacity={0.7}
          >
            {applying ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="git-merge-outline" size={16} color={colors.primary} />}
            <Text style={[styles.actionBtnText, { color: colors.primary }]}>Patch</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.primary, borderColor: colors.primary }]}
            onPress={() => {
              Alert.alert(
                "Xác nhận Apply",
                "Điều này sẽ thay thế toàn bộ config hiện tại. Tiếp tục?",
                [
                  { text: "Hủy", style: "cancel" },
                  { text: "Apply", style: "destructive", onPress: () => handleApply(false) },
                ],
              );
            }}
            disabled={applying}
            activeOpacity={0.7}
          >
            <Ionicons name="checkmark-outline" size={16} color="#fff" />
            <Text style={[styles.actionBtnText, { color: "#fff" }]}>Apply</Text>
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
  metaRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, marginBottom: 10 },
  metaChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, maxWidth: 200 },
  metaText: { fontSize: 10, fontFamily: "Inter_400Regular" },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 4 },
  loadingWrap: { alignItems: "center", paddingTop: 60, gap: 12 },
  loadingText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  codeBlock: { borderRadius: 16, borderWidth: 1, padding: 16 },
  codeText: { fontSize: 10, fontFamily: "monospace", lineHeight: 16 },
  editHintRow: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 12, borderWidth: 1, padding: 10, marginBottom: 10 },
  editHint: { fontSize: 11, fontFamily: "Inter_400Regular", flex: 1 },
  editor: { borderRadius: 16, borderWidth: 1, padding: 14, fontSize: 11, fontFamily: "monospace", lineHeight: 17, minHeight: 300 },
  actionBar: { flexDirection: "row", gap: 12, paddingHorizontal: 16, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 14, borderWidth: 1, paddingVertical: 13 },
  actionBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
