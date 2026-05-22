import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { login, connectionState } = useAuth();

  const [serverUrl, setServerUrl] = useState("http://");
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showToken, setShowToken] = useState(false);

  const isLoading = loading || connectionState === "connecting";

  const handleLogin = async () => {
    if (!serverUrl.trim() || !token.trim()) {
      setError("Vui lòng nhập Server URL và API Token");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await login(serverUrl.trim(), token.trim());
      router.replace("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Đăng nhập thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View style={styles.logoWrap}>
          <View style={[styles.logoBox, { backgroundColor: colors.primary + "20", borderColor: colors.primary + "30" }]}>
            <Text style={styles.logoEmoji}>🦅</Text>
          </View>
          <Text style={[styles.appName, { color: colors.foreground }]}>GoClaw</Text>
          <Text style={[styles.tagline, { color: colors.mutedForeground }]}>AI Agent Platform</Text>
        </View>

        {/* Card */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Kết nối máy chủ</Text>
          <Text style={[styles.cardSubtitle, { color: colors.mutedForeground }]}>
            Nhập địa chỉ máy chủ GoClaw và API token của bạn
          </Text>

          {/* Server URL */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Server URL</Text>
            <View style={[styles.inputWrap, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
              <Ionicons name="server-outline" size={16} color={colors.mutedForeground} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                value={serverUrl}
                onChangeText={setServerUrl}
                placeholder="https://goclaw.example.com"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
            </View>
          </View>

          {/* Token */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>API Token</Text>
            <View style={[styles.inputWrap, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
              <Ionicons name="key-outline" size={16} color={colors.mutedForeground} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                value={token}
                onChangeText={setToken}
                placeholder="Dán API token vào đây"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry={!showToken}
              />
              <TouchableOpacity onPress={() => setShowToken(!showToken)} style={styles.eyeBtn}>
                <Ionicons
                  name={showToken ? "eye-off-outline" : "eye-outline"}
                  size={16}
                  color={colors.mutedForeground}
                />
              </TouchableOpacity>
            </View>
            <Text style={[styles.hint, { color: colors.mutedForeground }]}>
              Lấy token từ Settings → API Keys trên web app
            </Text>
          </View>

          {/* Error */}
          {error && (
            <View style={[styles.errorBox, { backgroundColor: colors.destructive + "18", borderColor: colors.destructive + "40" }]}>
              <Ionicons name="alert-circle-outline" size={14} color={colors.destructive} />
              <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
            </View>
          )}

          {/* Login button */}
          <TouchableOpacity
            style={[styles.loginBtn, { backgroundColor: colors.primary, opacity: isLoading ? 0.7 : 1 }]}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Text style={styles.loginBtnText}>Kết nối</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Demo mode hint */}
        <TouchableOpacity
          style={styles.demoBtn}
          activeOpacity={0.7}
          onPress={() => router.replace("/")}
        >
          <Text style={[styles.demoText, { color: colors.mutedForeground }]}>
            Xem demo với dữ liệu mẫu →
          </Text>
        </TouchableOpacity>

        {/* Info boxes */}
        <View style={styles.infoGrid}>
          {[
            { icon: "shield-checkmark-outline" as const, title: "Bảo mật", desc: "Token được lưu an toàn trên thiết bị" },
            { icon: "flash-outline" as const, title: "Realtime", desc: "WebSocket + REST API" },
          ].map((item) => (
            <View key={item.title} style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name={item.icon} size={20} color={colors.primary} />
              <Text style={[styles.infoTitle, { color: colors.foreground }]}>{item.title}</Text>
              <Text style={[styles.infoDesc, { color: colors.mutedForeground }]}>{item.desc}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 20 },
  logoWrap: { alignItems: "center", marginBottom: 32 },
  logoBox: {
    width: 80,
    height: 80,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  logoEmoji: { fontSize: 40 },
  appName: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  tagline: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: 4 },
  card: { borderRadius: 20, borderWidth: 1, padding: 20, marginBottom: 16 },
  cardTitle: { fontSize: 18, fontFamily: "Inter_700Bold", marginBottom: 6 },
  cardSubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18, marginBottom: 20 },
  field: { marginBottom: 16 },
  label: { fontSize: 12, fontFamily: "Inter_600SemiBold", marginBottom: 6, letterSpacing: 0.3 },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 46,
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  eyeBtn: { padding: 4 },
  hint: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 5, lineHeight: 15 },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    marginBottom: 14,
  },
  errorText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
  loginBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 50,
    borderRadius: 14,
    marginTop: 4,
  },
  loginBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  demoBtn: { alignItems: "center", paddingVertical: 12, marginBottom: 16 },
  demoText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  infoGrid: { flexDirection: "row", gap: 10 },
  infoCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 5,
    alignItems: "flex-start",
  },
  infoTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  infoDesc: { fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 15 },
});
