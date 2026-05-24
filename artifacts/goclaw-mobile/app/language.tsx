import React from "react";
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

interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  available: boolean;
}

const LANGUAGES: Language[] = [
  { code: "vi", name: "Vietnamese", nativeName: "Tiếng Việt", flag: "🇻🇳", available: true },
  { code: "en", name: "English", nativeName: "English", flag: "🇺🇸", available: false },
  { code: "zh", name: "Chinese", nativeName: "中文", flag: "🇨🇳", available: false },
  { code: "ja", name: "Japanese", nativeName: "日本語", flag: "🇯🇵", available: false },
  { code: "ko", name: "Korean", nativeName: "한국어", flag: "🇰🇷", available: false },
  { code: "fr", name: "French", nativeName: "Français", flag: "🇫🇷", available: false },
  { code: "de", name: "German", nativeName: "Deutsch", flag: "🇩🇪", available: false },
  { code: "pt", name: "Portuguese", nativeName: "Português", flag: "🇧🇷", available: false },
];

export default function LanguageScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const topPad = insets.top;

  const currentLanguage = "vi";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Ngôn ngữ</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.infoBanner, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="information-circle-outline" size={14} color={colors.mutedForeground} />
          <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
            Ứng dụng hiện hỗ trợ đầy đủ tiếng Việt. Các ngôn ngữ khác sẽ được bổ sung trong các phiên bản tới.
          </Text>
        </View>

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>CHỌN NGÔN NGỮ</Text>

        {LANGUAGES.map((lang) => {
          const isActive = lang.code === currentLanguage;
          return (
            <TouchableOpacity
              key={lang.code}
              style={[
                styles.langItem,
                {
                  backgroundColor: isActive ? colors.primary + "12" : colors.card,
                  borderColor: isActive ? colors.primary + "40" : colors.border,
                  opacity: lang.available ? 1 : 0.5,
                },
              ]}
              disabled={!lang.available}
              activeOpacity={0.75}
            >
              <Text style={styles.flag}>{lang.flag}</Text>
              <View style={styles.langInfo}>
                <Text style={[styles.nativeName, { color: colors.foreground }]}>{lang.nativeName}</Text>
                <Text style={[styles.langName, { color: colors.mutedForeground }]}>{lang.name}</Text>
              </View>
              <View style={styles.langRight}>
                {isActive && (
                  <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                )}
                {!lang.available && (
                  <View style={[styles.soonBadge, { backgroundColor: colors.secondary }]}>
                    <Text style={[styles.soonText, { color: colors.mutedForeground }]}>Sắp có</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}

        <View style={[styles.contributeCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="people-outline" size={20} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.contributeTitle, { color: colors.foreground }]}>Đóng góp bản dịch</Text>
            <Text style={[styles.contributeDesc, { color: colors.mutedForeground }]}>
              Giúp dịch ứng dụng sang ngôn ngữ của bạn trên GitHub
            </Text>
          </View>
          <Ionicons name="open-outline" size={16} color={colors.mutedForeground} />
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
  content: { paddingHorizontal: 16, paddingTop: 8, gap: 0 },
  infoBanner: { flexDirection: "row", alignItems: "flex-start", gap: 7, borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 16 },
  infoText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 18 },
  sectionLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8, marginBottom: 10 },
  langItem: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 8 },
  flag: { fontSize: 24 },
  langInfo: { flex: 1 },
  nativeName: { fontSize: 15, fontFamily: "Inter_500Medium" },
  langName: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  langRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  soonBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  soonText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  contributeCard: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, borderWidth: 1, padding: 14, marginTop: 8 },
  contributeTitle: { fontSize: 14, fontFamily: "Inter_500Medium" },
  contributeDesc: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
});
