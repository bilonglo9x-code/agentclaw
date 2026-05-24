import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
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
import { useAuth } from "@/context/AuthContext";
import { useBranding } from "@/hooks/useBranding";

interface FieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
  colors: ReturnType<typeof useColors>;
  autoCapitalize?: "none" | "sentences" | "words";
  keyboardType?: "default" | "email-address" | "url";
}

function Field({ label, value, onChange, placeholder, hint, colors, autoCapitalize = "sentences", keyboardType = "default" }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <TextInput
        style={[styles.fieldInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.secondary }]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
        autoCorrect={false}
      />
      {hint && <Text style={[styles.fieldHint, { color: colors.mutedForeground }]}>{hint}</Text>}
    </View>
  );
}

export default function BrandingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { connected } = useAuth();
  const { branding, loading, saving, error, load, save } = useBranding();
  const topPad = insets.top;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [faviconUrl, setFaviconUrl] = useState("");
  const [accentColor, setAccentColor] = useState("");
  const [supportEmail, setSupportEmail] = useState("");

  useEffect(() => {
    setName(branding.name);
    setDescription(branding.description);
    setLogoUrl(branding.logoUrl);
    setFaviconUrl(branding.faviconUrl);
    setAccentColor(branding.accentColor);
    setSupportEmail(branding.supportEmail);
  }, [branding]);

  const isDirty =
    name !== branding.name ||
    description !== branding.description ||
    logoUrl !== branding.logoUrl ||
    faviconUrl !== branding.faviconUrl ||
    accentColor !== branding.accentColor ||
    supportEmail !== branding.supportEmail;

  const handleSave = async () => {
    try {
      await save({ name, description, logoUrl, faviconUrl, accentColor, supportEmail });
      Alert.alert("Đã lưu", "Cấu hình thương hiệu đã được cập nhật.");
    } catch {
      Alert.alert("Lỗi", "Không thể lưu cấu hình. Vui lòng thử lại.");
    }
  };

  const handleReset = () => {
    Alert.alert(
      "Đặt lại mặc định",
      "Đặt lại toàn bộ cấu hình thương hiệu về giá trị mặc định?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Đặt lại",
          style: "destructive",
          onPress: () => {
            setName("GoClaw");
            setDescription("AI Agent Platform");
            setLogoUrl("");
            setFaviconUrl("");
            setAccentColor("#f97316");
            setSupportEmail("");
          },
        },
      ],
    );
  };

  const accentPreview = accentColor.match(/^#[0-9a-fA-F]{6}$/) ? accentColor : null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 4, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>Thương hiệu</Text>
        <TouchableOpacity
          onPress={handleReset}
          style={[styles.iconBtn, { backgroundColor: "#ef444415" }]}
          activeOpacity={0.7}
        >
          <Ionicons name="refresh-circle-outline" size={16} color="#ef4444" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={load}
          style={[styles.iconBtn, { backgroundColor: colors.secondary }]}
          activeOpacity={0.7}
        >
          <Ionicons name="refresh-outline" size={16} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      {!connected ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={40} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Chưa kết nối server</Text>
        </View>
      ) : loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
        >
          {error && (
            <View style={[styles.errorBanner, { backgroundColor: colors.destructive + "22", borderColor: colors.destructive }]}>
              <Ionicons name="alert-circle-outline" size={14} color={colors.destructive} />
              <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
            </View>
          )}

          {/* Logo preview */}
          {logoUrl ? (
            <View style={[styles.previewCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>XEM TRƯỚC LOGO</Text>
              <Image source={{ uri: logoUrl }} style={styles.logoPreview} resizeMode="contain" />
            </View>
          ) : null}

          {/* App Identity */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <Ionicons name="business-outline" size={16} color={colors.primary} />
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Thông tin ứng dụng</Text>
            </View>
            <Field label="Tên ứng dụng" value={name} onChange={setName} placeholder="GoClaw" hint="Tên hiển thị trên tab trình duyệt và header" colors={colors} autoCapitalize="words" />
            <Field label="Mô tả" value={description} onChange={setDescription} placeholder="Nền tảng AI agent thông minh" hint="Mô tả ngắn gọn về ứng dụng" colors={colors} />
            <Field label="Email hỗ trợ" value={supportEmail} onChange={setSupportEmail} placeholder="support@example.com" hint="Hiển thị trong trang liên hệ / footer" colors={colors} autoCapitalize="none" keyboardType="email-address" />
          </View>

          {/* Assets */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <Ionicons name="images-outline" size={16} color={colors.primary} />
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Hình ảnh & Icon</Text>
            </View>
            <Field label="URL Logo" value={logoUrl} onChange={setLogoUrl} placeholder="https://example.com/logo.png" hint="PNG/SVG nền trong suốt, tối thiểu 128×128px" colors={colors} autoCapitalize="none" keyboardType="url" />
            <Field label="URL Favicon" value={faviconUrl} onChange={setFaviconUrl} placeholder="https://example.com/favicon.ico" hint="ICO hoặc PNG 32×32px" colors={colors} autoCapitalize="none" keyboardType="url" />
          </View>

          {/* Theme */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <Ionicons name="color-palette-outline" size={16} color={colors.primary} />
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Màu sắc thương hiệu</Text>
            </View>
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Màu nhấn (Hex)</Text>
              <View style={styles.colorRow}>
                <TextInput
                  style={[styles.fieldInput, styles.colorInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.secondary }]}
                  value={accentColor}
                  onChangeText={setAccentColor}
                  placeholder="#f97316"
                  placeholderTextColor={colors.mutedForeground}
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={7}
                />
                {accentPreview && (
                  <View style={[styles.colorSwatch, { backgroundColor: accentPreview }]} />
                )}
              </View>
              <Text style={[styles.fieldHint, { color: colors.mutedForeground }]}>Ví dụ: #f97316 (amber), #3b82f6 (blue)</Text>
            </View>
          </View>

          {/* Save button */}
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: isDirty ? colors.primary : colors.muted, opacity: saving ? 0.7 : 1 }]}
            onPress={handleSave}
            activeOpacity={0.8}
            disabled={saving || !isDirty}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="checkmark-outline" size={18} color={isDirty ? "#fff" : colors.mutedForeground} />
            )}
            <Text style={[styles.saveBtnText, { color: isDirty ? "#fff" : colors.mutedForeground }]}>
              {saving ? "Đang lưu..." : "Lưu thay đổi"}
            </Text>
          </TouchableOpacity>

          <View style={[styles.infoBanner, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
            <Ionicons name="information-circle-outline" size={14} color={colors.mutedForeground} />
            <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
              Cấu hình được lưu vào hệ thống qua <Text style={{ fontFamily: "Inter_600SemiBold" }}>/v1/system-configs</Text>. Một số thay đổi cần reload trang web để có hiệu lực.
            </Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  backBtn: { padding: 4, marginRight: 6 },
  title: { flex: 1, fontSize: 17, fontFamily: "Inter_600SemiBold" },
  iconBtn: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 14 },
  errorBanner: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 10, padding: 12 },
  errorText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
  previewCard: { borderWidth: 1, borderRadius: 12, padding: 16, alignItems: "center", gap: 8 },
  sectionLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 1 },
  logoPreview: { width: 120, height: 60 },
  card: { borderWidth: 1, borderRadius: 12, padding: 16, gap: 14 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 },
  cardTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  field: { gap: 6 },
  fieldLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5, textTransform: "uppercase" },
  fieldInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: "Inter_400Regular" },
  fieldHint: { fontSize: 11, fontFamily: "Inter_400Regular" },
  colorRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  colorInput: { flex: 1 },
  colorSwatch: { width: 32, height: 32, borderRadius: 8 },
  saveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 12, paddingVertical: 14 },
  saveBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  infoBanner: { flexDirection: "row", alignItems: "flex-start", gap: 8, borderWidth: 1, borderRadius: 10, padding: 12 },
  infoText: { fontSize: 11, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 16 },
});
