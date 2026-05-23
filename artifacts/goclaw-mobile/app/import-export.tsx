import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  Share,
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

interface ExportItem {
  key: string;
  label: string;
  description: string;
  icon: keyof typeof Ionicons["glyphMap"];
  color: string;
  endpoint: string;
}

const EXPORT_ITEMS: ExportItem[] = [
  { key: "agents", label: "Agents", description: "Toàn bộ cấu hình agents, skills và files", icon: "hardware-chip-outline", color: "#f97316", endpoint: "/v1/agents/export" },
  { key: "config", label: "System Config", description: "Cấu hình hệ thống (providers, channels, MCP...)", icon: "settings-outline", color: "#60a5fa", endpoint: "/v1/config/export" },
  { key: "vault", label: "Vault", description: "Tài liệu vault (trừ dữ liệu nhạy cảm)", icon: "archive-outline", color: "#a78bfa", endpoint: "/v1/vault/export" },
  { key: "skills", label: "Skills", description: "Thư viện skills và code", icon: "flash-outline", color: "#f59e0b", endpoint: "/v1/skills/export" },
  { key: "cron", label: "Cron Jobs", description: "Danh sách cron jobs và lịch chạy", icon: "time-outline", color: "#22c55e", endpoint: "/v1/cron/export" },
  { key: "teams", label: "Teams", description: "Cấu trúc teams và members", icon: "people-circle-outline", color: "#22c55e", endpoint: "/v1/teams/export" },
];

export default function ImportExportScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { connected, http, serverUrl } = useAuth();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [exporting, setExporting] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggleSelect = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleExport = async (item: ExportItem) => {
    if (!connected) {
      Alert.alert("Chưa kết nối", "Kết nối máy chủ để export dữ liệu");
      return;
    }
    setExporting(item.key);
    try {
      const url = `${serverUrl}${item.endpoint}`;
      await Share.share({
        message: `Export URL: ${url}\n\nDùng API token để xác thực khi tải file export.`,
        title: `GoClaw Export — ${item.label}`,
      });
    } catch {
      Alert.alert("Lỗi", "Không thể export");
    } finally {
      setExporting(null);
    }
  };

  const handleExportAll = async () => {
    if (!connected) {
      Alert.alert("Chưa kết nối", "Kết nối máy chủ để export dữ liệu");
      return;
    }
    const items = EXPORT_ITEMS.filter((i) => selected.size === 0 || selected.has(i.key));
    const urls = items.map((i) => `${serverUrl}${i.endpoint}`).join("\n");
    try {
      await Share.share({
        message: `GoClaw Export URLs:\n\n${urls}\n\nDùng API token để xác thực.`,
        title: "GoClaw — Export All",
      });
    } catch {
      Alert.alert("Lỗi", "Không thể share");
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Import / Export</Text>
        {selected.size > 0 && (
          <TouchableOpacity
            style={[styles.exportBtn, { backgroundColor: colors.primary }]}
            onPress={handleExportAll}
            activeOpacity={0.85}
          >
            <Ionicons name="share-outline" size={15} color="#fff" />
            <Text style={styles.exportBtnText}>Export ({selected.size})</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Connection warning */}
        {!connected && (
          <View style={[styles.warnBanner, { backgroundColor: "#f59e0b18", borderColor: "#f59e0b40" }]}>
            <Ionicons name="warning-outline" size={14} color="#f59e0b" />
            <Text style={[styles.warnText, { color: "#f59e0b" }]}>
              Cần kết nối máy chủ để export/import dữ liệu thực
            </Text>
          </View>
        )}

        {/* Export section */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>EXPORT</Text>
        <Text style={[styles.sectionHint, { color: colors.mutedForeground }]}>
          Chọn các mục muốn export hoặc bấm vào từng mục để export riêng lẻ
        </Text>

        {EXPORT_ITEMS.map((item) => {
          const isSelected = selected.has(item.key);
          const isExporting = exporting === item.key;
          return (
            <TouchableOpacity
              key={item.key}
              style={[
                styles.exportCard,
                { backgroundColor: colors.card, borderColor: isSelected ? item.color + "50" : colors.border },
                isSelected && { borderWidth: 1.5 },
              ]}
              onPress={() => toggleSelect(item.key)}
              onLongPress={() => handleExport(item)}
              activeOpacity={0.75}
            >
              <View style={[styles.exportIcon, { backgroundColor: item.color + "18" }]}>
                <Ionicons name={item.icon} size={20} color={item.color} />
              </View>
              <View style={styles.exportInfo}>
                <Text style={[styles.exportLabel, { color: colors.foreground }]}>{item.label}</Text>
                <Text style={[styles.exportDesc, { color: colors.mutedForeground }]}>{item.description}</Text>
              </View>
              <View style={styles.exportActions}>
                {isSelected && (
                  <Ionicons name="checkmark-circle" size={18} color={item.color} />
                )}
                <TouchableOpacity
                  onPress={() => handleExport(item)}
                  style={[styles.exportNowBtn, { backgroundColor: item.color + "15" }]}
                  activeOpacity={0.7}
                  disabled={isExporting}
                >
                  {isExporting ? (
                    <ActivityIndicator size="small" color={item.color} />
                  ) : (
                    <Ionicons name="share-outline" size={15} color={item.color} />
                  )}
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Import section */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground, marginTop: 24 }]}>IMPORT</Text>
        <View style={[styles.importCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="cloud-upload-outline" size={32} color={colors.mutedForeground} />
          <Text style={[styles.importTitle, { color: colors.foreground }]}>Import từ file JSON</Text>
          <Text style={[styles.importDesc, { color: colors.mutedForeground }]}>
            Tính năng import file đang được phát triển. Hiện tại dùng web dashboard để import cấu hình.
          </Text>
          <TouchableOpacity
            style={[styles.webDashBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
            activeOpacity={0.75}
            onPress={() =>
              Alert.alert("Truy cập Web Dashboard", `Mở ${serverUrl || "server URL"} trên trình duyệt để import cấu hình.`)
            }
          >
            <Ionicons name="open-outline" size={15} color={colors.mutedForeground} />
            <Text style={[styles.webDashText, { color: colors.mutedForeground }]}>Mở Web Dashboard</Text>
          </TouchableOpacity>
        </View>

        {/* Tips */}
        <View style={[styles.tipsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.tipsTitle, { color: colors.foreground }]}>Hướng dẫn</Text>
          {[
            "Nhấn giữ một mục để export ngay lập tức",
            "Tick chọn nhiều mục → bấm Export (n) để share cùng lúc",
            "File export là JSON, có thể dùng để backup hoặc chuyển sang server khác",
            "Import yêu cầu token có quyền admin",
          ].map((tip, i) => (
            <View key={i} style={styles.tipRow}>
              <Ionicons name="information-circle-outline" size={13} color={colors.mutedForeground} style={{ marginTop: 1 }} />
              <Text style={[styles.tipText, { color: colors.mutedForeground }]}>{tip}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, gap: 10 },
  backBtn: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 18, fontFamily: "Inter_700Bold" },
  exportBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, height: 34, borderRadius: 10 },
  exportBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  content: { paddingHorizontal: 16, paddingTop: 8 },
  warnBanner: { flexDirection: "row", alignItems: "center", gap: 7, borderRadius: 10, borderWidth: 1, padding: 10, marginBottom: 16 },
  warnText: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1 },
  sectionLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8, marginBottom: 6 },
  sectionHint: { fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 12, lineHeight: 17 },
  exportCard: { flexDirection: "row", alignItems: "center", borderRadius: 14, borderWidth: 1, padding: 14, gap: 12, marginBottom: 8 },
  exportIcon: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  exportInfo: { flex: 1 },
  exportLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  exportDesc: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2, lineHeight: 16 },
  exportActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  exportNowBtn: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  importCard: { borderRadius: 16, borderWidth: 1, padding: 20, alignItems: "center", gap: 10, marginBottom: 16 },
  importTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  importDesc: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 18 },
  webDashBtn: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 9, marginTop: 4 },
  webDashText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  tipsCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 8, marginBottom: 16 },
  tipsTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  tipRow: { flexDirection: "row", gap: 7, alignItems: "flex-start" },
  tipText: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 17 },
});
