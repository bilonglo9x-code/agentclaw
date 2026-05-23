import React, { useState } from "react";
import {
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

interface OptionItemProps {
  label: string;
  description?: string;
  selected: boolean;
  locked?: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
  icon?: keyof typeof Ionicons["glyphMap"];
  iconColor?: string;
  badge?: string;
}

function OptionItem({ label, description, selected, locked, onPress, colors, icon, iconColor, badge }: OptionItemProps) {
  return (
    <TouchableOpacity
      style={[
        optStyles.item,
        { backgroundColor: selected ? colors.primary + "12" : colors.card, borderColor: selected ? colors.primary + "40" : colors.border },
      ]}
      onPress={onPress}
      disabled={locked}
      activeOpacity={0.75}
    >
      {icon && (
        <View style={[optStyles.icon, { backgroundColor: (iconColor ?? colors.primary) + "18" }]}>
          <Ionicons name={icon} size={18} color={iconColor ?? colors.primary} />
        </View>
      )}
      <View style={optStyles.info}>
        <View style={optStyles.labelRow}>
          <Text style={[optStyles.label, { color: colors.foreground }]}>{label}</Text>
          {badge && (
            <View style={[optStyles.badge, { backgroundColor: colors.primary + "20" }]}>
              <Text style={[optStyles.badgeText, { color: colors.primary }]}>{badge}</Text>
            </View>
          )}
          {locked && (
            <View style={[optStyles.badge, { backgroundColor: colors.secondary }]}>
              <Text style={[optStyles.badgeText, { color: colors.mutedForeground }]}>Sắp có</Text>
            </View>
          )}
        </View>
        {description && (
          <Text style={[optStyles.desc, { color: colors.mutedForeground }]}>{description}</Text>
        )}
      </View>
      {selected && !locked && (
        <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
      )}
      {locked && (
        <Ionicons name="lock-closed-outline" size={16} color={colors.mutedForeground} />
      )}
    </TouchableOpacity>
  );
}

const optStyles = StyleSheet.create({
  item: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 8 },
  icon: { width: 38, height: 38, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  info: { flex: 1 },
  labelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  label: { fontSize: 14, fontFamily: "Inter_500Medium" },
  badge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  badgeText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  desc: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
});

export default function ThemeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [accentColor] = useState<string>("amber");

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Giao diện & Theme</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Preview card */}
        <View style={[styles.previewCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.previewBar}>
            <View style={[styles.previewDot, { backgroundColor: "#ef4444" }]} />
            <View style={[styles.previewDot, { backgroundColor: "#f59e0b" }]} />
            <View style={[styles.previewDot, { backgroundColor: "#22c55e" }]} />
          </View>
          <View style={[styles.previewBody, { backgroundColor: "#09090b" }]}>
            <View style={[styles.previewSidebar, { backgroundColor: "#18181b" }]}>
              {[colors.primary, "#a1a1aa", "#a1a1aa", "#a1a1aa"].map((c, i) => (
                <View key={i} style={[styles.previewSidebarItem, { backgroundColor: c + "20" }]} />
              ))}
            </View>
            <View style={styles.previewContent}>
              <View style={[styles.previewLine, { backgroundColor: "#27272a", width: "70%" }]} />
              <View style={[styles.previewLine, { backgroundColor: "#27272a", width: "90%" }]} />
              <View style={[styles.previewLine, { backgroundColor: colors.primary + "40", width: "50%" }]} />
            </View>
          </View>
          <View style={styles.previewFooter}>
            <Ionicons name="moon" size={12} color={colors.primary} />
            <Text style={[styles.previewLabel, { color: colors.mutedForeground }]}>Dark Mode — Đang dùng</Text>
          </View>
        </View>

        {/* Color scheme */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>CHẾ ĐỘ HIỂN THỊ</Text>
        <OptionItem
          label="Dark Mode"
          description="Nền tối zinc-950, giảm mỏi mắt khi dùng ban đêm"
          selected
          icon="moon-outline"
          iconColor="#a78bfa"
          badge="Đang dùng"
          onPress={() => {}}
          colors={colors}
        />
        <OptionItem
          label="Light Mode"
          description="Nền sáng, phù hợp ban ngày"
          selected={false}
          locked
          icon="sunny-outline"
          iconColor="#f59e0b"
          onPress={() => {}}
          colors={colors}
        />
        <OptionItem
          label="Theo hệ thống"
          description="Tự động chuyển theo dark/light của thiết bị"
          selected={false}
          locked
          icon="contrast-outline"
          iconColor="#60a5fa"
          onPress={() => {}}
          colors={colors}
        />

        {/* Accent color */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>MÀU NHẤN</Text>
        <View style={[styles.colorGrid, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {[
            { key: "amber", color: "#f97316", label: "Amber" },
            { key: "blue", color: "#3b82f6", label: "Blue" },
            { key: "purple", color: "#a855f7", label: "Purple" },
            { key: "green", color: "#22c55e", label: "Green" },
            { key: "red", color: "#ef4444", label: "Red" },
            { key: "cyan", color: "#06b6d4", label: "Cyan" },
          ].map((c) => (
            <TouchableOpacity
              key={c.key}
              style={[
                styles.colorItem,
                { backgroundColor: c.color + "20", borderColor: accentColor === c.key ? c.color : "transparent" },
              ]}
              onPress={() => {}}
              disabled={c.key !== "amber"}
              activeOpacity={0.7}
            >
              <View style={[styles.colorDot, { backgroundColor: c.color }]} />
              <Text style={[styles.colorLabel, { color: accentColor === c.key ? c.color : colors.mutedForeground }]}>{c.label}</Text>
              {c.key !== "amber" && (
                <Text style={{ fontSize: 8, color: colors.mutedForeground, fontFamily: "Inter_400Regular" }}>Soon</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Font size */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>GIAO DIỆN</Text>
        <OptionItem
          label="Compact Mode"
          description="Thu nhỏ khoảng cách giữa các mục, hiển thị được nhiều hơn"
          selected={false}
          locked
          icon="resize-outline"
          iconColor="#f59e0b"
          onPress={() => {}}
          colors={colors}
        />
        <OptionItem
          label="Cỡ chữ lớn"
          description="Tăng kích thước chữ cho dễ đọc hơn"
          selected={false}
          locked
          icon="text-outline"
          iconColor="#60a5fa"
          onPress={() => {}}
          colors={colors}
        />

        <Text style={[styles.note, { color: colors.mutedForeground }]}>
          * Hiện tại ứng dụng chỉ hỗ trợ Dark Mode với màu nhấn Amber. Các tuỳ chọn khác sẽ được mở trong phiên bản tới.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, gap: 10 },
  backBtn: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 18, fontFamily: "Inter_700Bold" },
  content: { paddingHorizontal: 16, paddingTop: 8 },
  previewCard: { borderRadius: 18, borderWidth: 1, overflow: "hidden", marginBottom: 20 },
  previewBar: { flexDirection: "row", gap: 6, padding: 10, alignItems: "center" },
  previewDot: { width: 10, height: 10, borderRadius: 5 },
  previewBody: { flexDirection: "row", height: 80 },
  previewSidebar: { width: 40, gap: 6, padding: 6 },
  previewSidebarItem: { height: 8, borderRadius: 4 },
  previewContent: { flex: 1, gap: 6, padding: 10, justifyContent: "center" },
  previewLine: { height: 7, borderRadius: 4 },
  previewFooter: { flexDirection: "row", alignItems: "center", gap: 6, padding: 10 },
  previewLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  sectionLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8, marginBottom: 10, marginTop: 4 },
  colorGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 8 },
  colorItem: { width: "30%", alignItems: "center", gap: 4, borderRadius: 12, borderWidth: 2, padding: 10 },
  colorDot: { width: 24, height: 24, borderRadius: 12 },
  colorLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
  note: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17, textAlign: "center", paddingVertical: 12 },
});
