import React, { useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { useBackup } from "@/hooks/useBackup";
import { useAuth } from "@/context/AuthContext";

export default function BackupScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { connected } = useAuth();
  const { preflight, phase, downloadUrl, progressMsg, error, loadPreflight, runBackup } = useBackup();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  useEffect(() => {
    if (connected) loadPreflight();
  }, [connected]);

  const handleBackup = () => {
    Alert.alert(
      "Tạo Backup",
      "Quá trình này có thể mất vài phút. Tiếp tục?",
      [
        { text: "Hủy", style: "cancel" },
        { text: "Bắt đầu", onPress: runBackup },
      ],
    );
  };

  const phaseColor = phase === "done" ? "#22c55e" : phase === "error" ? "#ef4444" : phase === "running" ? colors.primary : colors.mutedForeground;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 4 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>Backup & Restore</Text>
        <TouchableOpacity onPress={loadPreflight} style={[styles.iconBtn, { backgroundColor: colors.muted }]} activeOpacity={0.7}>
          <Ionicons name="refresh-outline" size={15} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Status banner */}
        {(phase !== "idle" || error) && (
          <View style={[styles.statusBanner, { backgroundColor: phaseColor + "15", borderColor: phaseColor + "30" }]}>
            {phase === "running" ? (
              <ActivityIndicator size="small" color={phaseColor} />
            ) : (
              <Ionicons
                name={phase === "done" ? "checkmark-circle" : "alert-circle"}
                size={18}
                color={phaseColor}
              />
            )}
            <Text style={[styles.statusText, { color: phaseColor }]}>
              {error ?? progressMsg}
            </Text>
          </View>
        )}

        {/* Preflight info */}
        {preflight && (
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Thông tin hệ thống</Text>
            {[
              { label: "Database", value: preflight.db_size_human, icon: "server-outline" as const },
              { label: "Data directory", value: preflight.data_dir_size_human, icon: "folder-outline" as const },
              { label: "Workspace", value: preflight.workspace_size_human, icon: "code-slash-outline" as const },
              { label: "Dung lượng trống", value: preflight.free_disk_human, icon: "save-outline" as const, color: preflight.has_enough_space ? "#22c55e" : "#ef4444" },
            ].map((r) => (
              <View key={r.label} style={[styles.infoRow, { borderBottomColor: colors.border }]}>
                <Ionicons name={r.icon} size={14} color={r.color ?? colors.mutedForeground} />
                <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{r.label}</Text>
                <Text style={[styles.infoValue, { color: r.color ?? colors.foreground }]}>{r.value}</Text>
              </View>
            ))}
            {!preflight.has_enough_space && (
              <View style={[styles.warning, { backgroundColor: "#ef444415", borderColor: "#ef444430" }]}>
                <Ionicons name="warning-outline" size={14} color="#ef4444" />
                <Text style={[styles.warningText, { color: "#ef4444" }]}>Không đủ dung lượng để backup</Text>
              </View>
            )}
          </View>
        )}

        {/* Backup action */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.actionHeader}>
            <View style={[styles.actionIcon, { backgroundColor: "#f97316" + "18" }]}>
              <Ionicons name="cloud-upload-outline" size={22} color="#f97316" />
            </View>
            <View style={styles.actionInfo}>
              <Text style={[styles.actionTitle, { color: colors.foreground }]}>Tạo Backup mới</Text>
              <Text style={[styles.actionDesc, { color: colors.mutedForeground }]}>
                Xuất toàn bộ dữ liệu: DB, files, workspace thành file .tar.gz
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={handleBackup}
            disabled={phase === "running" || (preflight ? !preflight.has_enough_space : false)}
            style={[styles.actionBtn, { backgroundColor: phase === "running" ? colors.muted : "#f97316" }]}
            activeOpacity={0.8}
          >
            {phase === "running" ? (
              <>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={styles.actionBtnText}>Đang chạy...</Text>
              </>
            ) : (
              <>
                <Ionicons name="download-outline" size={16} color="#fff" />
                <Text style={styles.actionBtnText}>Bắt đầu Backup</Text>
              </>
            )}
          </TouchableOpacity>

          {phase === "done" && downloadUrl && (
            <View style={[styles.downloadBox, { backgroundColor: "#22c55e15", borderColor: "#22c55e30" }]}>
              <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
              <Text style={[styles.downloadText, { color: "#22c55e" }]}>
                Backup hoàn thành. Tải về qua server URL:
              </Text>
              <Text style={[styles.downloadUrl, { color: "#60a5fa" }]}>{downloadUrl}</Text>
            </View>
          )}
        </View>

        {/* Restore info */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.actionHeader}>
            <View style={[styles.actionIcon, { backgroundColor: "#60a5fa18" }]}>
              <Ionicons name="cloud-download-outline" size={22} color="#60a5fa" />
            </View>
            <View style={styles.actionInfo}>
              <Text style={[styles.actionTitle, { color: colors.foreground }]}>Restore từ Backup</Text>
              <Text style={[styles.actionDesc, { color: colors.mutedForeground }]}>
                Upload file .tar.gz để khôi phục hệ thống. Thao tác này sẽ ghi đè toàn bộ dữ liệu hiện tại.
              </Text>
            </View>
          </View>
          <View style={[styles.restoreNote, { backgroundColor: "#ef444410", borderColor: "#ef444430" }]}>
            <Ionicons name="warning-outline" size={14} color="#ef4444" />
            <Text style={[styles.restoreNoteText, { color: "#ef4444" }]}>
              Chức năng restore yêu cầu upload file từ thiết bị. Sử dụng giao diện web để thực hiện thao tác này an toàn hơn.
            </Text>
          </View>
        </View>

        {/* S3 backup note */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.actionHeader}>
            <View style={[styles.actionIcon, { backgroundColor: "#a78bfa18" }]}>
              <Ionicons name="logo-amazon" size={22} color="#a78bfa" />
            </View>
            <View style={styles.actionInfo}>
              <Text style={[styles.actionTitle, { color: colors.foreground }]}>S3 Backup</Text>
              <Text style={[styles.actionDesc, { color: colors.mutedForeground }]}>
                Backup tự động lên Amazon S3. Cấu hình qua Settings → Integrations.
              </Text>
            </View>
          </View>
        </View>
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
  content: { padding: 16, gap: 14 },
  statusBanner: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 14, borderWidth: 1, padding: 14 },
  statusText: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 },
  section: { borderRadius: 18, borderWidth: 1, padding: 16, gap: 12 },
  sectionTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 4 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth },
  infoLabel: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular" },
  infoValue: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  warning: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 10, borderWidth: 1, padding: 10 },
  warningText: { fontSize: 12, fontFamily: "Inter_500Medium", flex: 1 },
  actionHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  actionIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  actionInfo: { flex: 1, gap: 4 },
  actionTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  actionDesc: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  actionBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14, paddingVertical: 12 },
  actionBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#fff" },
  downloadBox: { borderRadius: 12, borderWidth: 1, padding: 12, gap: 6 },
  downloadText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  downloadUrl: { fontSize: 11, fontFamily: "monospace" },
  restoreNote: { flexDirection: "row", alignItems: "flex-start", gap: 8, borderRadius: 12, borderWidth: 1, padding: 12 },
  restoreNoteText: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 17 },
});
