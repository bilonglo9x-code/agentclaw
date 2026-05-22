import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { usePackages, PackageInfo, GitHubPackageInfo } from "@/hooks/usePackages";
import { useAuth } from "@/context/AuthContext";

const MOCK_PIP: PackageInfo[] = [
  { name: "openai", version: "1.35.0" },
  { name: "anthropic", version: "0.28.0" },
  { name: "langchain", version: "0.2.5" },
  { name: "numpy", version: "1.26.4" },
  { name: "pandas", version: "2.2.2" },
  { name: "requests", version: "2.32.3" },
  { name: "pydantic", version: "2.7.4" },
];

const MOCK_NPM: PackageInfo[] = [
  { name: "@anthropic-ai/sdk", version: "0.21.1" },
  { name: "openai", version: "4.52.0" },
  { name: "axios", version: "1.7.2" },
  { name: "zod", version: "3.23.8" },
];

const MOCK_SYSTEM: PackageInfo[] = [
  { name: "python3", version: "3.11.9" },
  { name: "node", version: "20.15.0" },
  { name: "git", version: "2.45.1" },
  { name: "curl", version: "8.8.0" },
];

const OUTDATED: Record<string, string> = {
  langchain: "0.3.0",
  numpy: "2.0.0",
  axios: "1.7.5",
};

type Tab = "pip" | "npm" | "system" | "github";

const MANAGER_CONFIG: Record<Tab, { color: string; icon: keyof typeof Ionicons["glyphMap"]; label: string }> = {
  pip: { color: "#3b82f6", icon: "logo-python", label: "pip" },
  npm: { color: "#22c55e", icon: "logo-nodejs", label: "npm" },
  system: { color: "#a78bfa", icon: "layers-outline", label: "System" },
  github: { color: "#e5e7eb", icon: "logo-github", label: "GitHub" },
};

export default function PackagesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { connected } = useAuth();
  const { packages, loading, installing, error, refresh, installPackage } = usePackages();
  const [tab, setTab] = useState<Tab>("pip");
  const [installInput, setInstallInput] = useState("");
  const [search, setSearch] = useState("");
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const pip = connected && packages.pip ? packages.pip : MOCK_PIP;
  const npm = connected && packages.npm ? packages.npm : MOCK_NPM;
  const system = connected && packages.system ? packages.system : MOCK_SYSTEM;
  const github = packages.github ?? [];

  const rawList: (PackageInfo | GitHubPackageInfo)[] = tab === "pip" ? pip : tab === "npm" ? npm : tab === "system" ? system : github;
  const cfg = MANAGER_CONFIG[tab];

  const filtered = useMemo(() => {
    if (!search.trim()) return rawList;
    const q = search.toLowerCase();
    return rawList.filter((p) => p.name.toLowerCase().includes(q));
  }, [rawList, search]);

  const outdatedCount = rawList.filter((p) => "version" in p && OUTDATED[p.name]).length;

  const handleInstall = async () => {
    if (!installInput.trim()) return;
    const pkg = installInput.trim();
    setInstallInput("");
    const result = await installPackage(pkg);
    if (!result.ok) {
      Alert.alert("Lỗi cài đặt", result.error ?? "Unknown error");
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 4 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>Packages</Text>
        <TouchableOpacity onPress={refresh} style={[styles.iconBtn, { backgroundColor: colors.muted }]} activeOpacity={0.7}>
          {loading ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="refresh-outline" size={15} color={colors.mutedForeground} />}
        </TouchableOpacity>
      </View>

      {/* Tab row */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRow}>
        {(["pip", "npm", "system", "github"] as Tab[]).map((t) => {
          const c = MANAGER_CONFIG[t];
          const active = tab === t;
          const count = t === "pip" ? pip.length : t === "npm" ? npm.length : t === "system" ? system.length : github.length;
          return (
            <TouchableOpacity
              key={t}
              onPress={() => { setTab(t); setSearch(""); }}
              style={[styles.tabChip, { backgroundColor: active ? c.color + "25" : colors.muted, borderColor: active ? c.color + "60" : colors.border }]}
              activeOpacity={0.7}
            >
              <Ionicons name={c.icon} size={14} color={active ? c.color : colors.mutedForeground} />
              <Text style={[styles.tabLabel, { color: active ? c.color : colors.mutedForeground }]}>{c.label}</Text>
              <View style={[styles.countBadge, { backgroundColor: active ? c.color + "30" : colors.border + "80" }]}>
                <Text style={[styles.countText, { color: active ? c.color : colors.mutedForeground }]}>{count}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Search + summary bar */}
      <View style={[styles.searchRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Ionicons name="search-outline" size={14} color={colors.mutedForeground} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder={`Tìm trong ${cfg.label}...`}
          placeholderTextColor={colors.mutedForeground}
          style={[styles.searchInput, { color: colors.foreground }]}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={14} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}
        <View style={[styles.totalBadge, { backgroundColor: cfg.color + "18" }]}>
          <Text style={[styles.totalText, { color: cfg.color }]}>{filtered.length}</Text>
        </View>
      </View>

      {outdatedCount > 0 && (tab === "pip" || tab === "npm") && (
        <View style={[styles.outdatedBanner, { backgroundColor: "#f59e0b15", borderColor: "#f59e0b30" }]}>
          <Ionicons name="arrow-up-circle-outline" size={14} color="#f59e0b" />
          <Text style={[styles.outdatedText, { color: "#f59e0b" }]}>{outdatedCount} package có bản cập nhật mới</Text>
        </View>
      )}

      {/* Install bar (only for pip/npm) */}
      {(tab === "pip" || tab === "npm") && (
        <View style={[styles.installBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="cloud-download-outline" size={16} color={cfg.color} />
          <TextInput
            value={installInput}
            onChangeText={setInstallInput}
            placeholder={`Tên package ${tab === "pip" ? "pip" : "npm"}...`}
            placeholderTextColor={colors.mutedForeground}
            style={[styles.installInput, { color: colors.foreground }]}
            onSubmitEditing={handleInstall}
            returnKeyType="done"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            onPress={handleInstall}
            disabled={!installInput.trim() || installing}
            style={[styles.installBtn, { backgroundColor: !installInput.trim() ? colors.muted : cfg.color }]}
            activeOpacity={0.8}
          >
            {installing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={[styles.installBtnText, { color: !installInput.trim() ? colors.mutedForeground : "#fff" }]}>Install</Text>
            )}
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
        keyExtractor={(item) => item.name}
        renderItem={({ item }) => {
          const isGH = "repo" in item;
          const latestVersion = "version" in item ? OUTDATED[item.name] : undefined;
          return (
            <View style={[styles.pkgRow, { borderBottomColor: colors.border }]}>
              <View style={[styles.pkgIcon, { backgroundColor: cfg.color + "15" }]}>
                <Ionicons name={cfg.icon} size={16} color={cfg.color} />
              </View>
              <View style={styles.pkgInfo}>
                <Text style={[styles.pkgName, { color: colors.foreground }]}>{item.name}</Text>
                {isGH && (
                  <Text style={[styles.pkgRepo, { color: colors.mutedForeground }]} numberOfLines={1}>
                    {(item as GitHubPackageInfo).repo}
                  </Text>
                )}
              </View>
              <View style={styles.pkgRight}>
                <View style={[styles.versionBadge, { backgroundColor: cfg.color + "15" }]}>
                  <Text style={[styles.versionText, { color: cfg.color }]}>
                    {"version" in item ? `v${item.version}` : (item as GitHubPackageInfo).tag}
                  </Text>
                </View>
                {latestVersion && (
                  <View style={[styles.updateBadge, { backgroundColor: "#f59e0b15" }]}>
                    <Ionicons name="arrow-up" size={9} color="#f59e0b" />
                    <Text style={[styles.updateText, { color: "#f59e0b" }]}>v{latestVersion}</Text>
                  </View>
                )}
              </View>
            </View>
          );
        }}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="cube-outline" size={36} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              {search ? "Không tìm thấy package" : "Không có packages"}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingBottom: 8, gap: 8 },
  backBtn: { padding: 4 },
  title: { flex: 1, fontSize: 20, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  iconBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  tabRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 6, gap: 8 },
  tabChip: { flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderWidth: 1 },
  tabLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  countBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8, minWidth: 20, alignItems: "center" },
  countText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  searchRow: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 16, marginBottom: 6, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, height: 38 },
  searchInput: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular" },
  totalBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  totalText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  outdatedBanner: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 16, marginBottom: 6, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  outdatedText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  installBar: { flexDirection: "row", alignItems: "center", gap: 10, marginHorizontal: 16, marginBottom: 6, borderRadius: 16, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10 },
  installInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  installBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 12 },
  installBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  errorBanner: { marginHorizontal: 16, marginBottom: 8, borderRadius: 10, padding: 10 },
  errorText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  list: {},
  pkgRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 },
  pkgIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  pkgInfo: { flex: 1 },
  pkgName: { fontSize: 14, fontFamily: "Inter_500Medium" },
  pkgRepo: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  pkgRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  versionBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  versionText: { fontSize: 11, fontFamily: "monospace" },
  updateBadge: { flexDirection: "row", alignItems: "center", gap: 2, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 7 },
  updateText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  emptyWrap: { alignItems: "center", paddingTop: 80, gap: 10 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
});
