import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useStorage, StorageFile } from "@/hooks/useStorage";
import { useAuth } from "@/context/AuthContext";

const MOCK_FILES: StorageFile[] = [
  { path: "/agents", name: "agents", isDir: true, size: 0, hasChildren: true, protected: false },
  { path: "/sessions", name: "sessions", isDir: true, size: 0, hasChildren: true, protected: true },
  { path: "/memory", name: "memory", isDir: true, size: 0, hasChildren: true, protected: false },
  { path: "/vault", name: "vault", isDir: true, size: 0, hasChildren: true, protected: false },
  { path: "/logs", name: "logs", isDir: true, size: 0, hasChildren: true, protected: true },
  { path: "/config.yaml", name: "config.yaml", isDir: false, size: 4200, protected: true },
  { path: "/agents/assistant/workspace/notes.md", name: "notes.md", isDir: false, size: 1842, protected: false },
  { path: "/agents/assistant/workspace/context.md", name: "context.md", isDir: false, size: 3120, protected: false },
];

function fmtSize(bytes: number): string {
  if (bytes === 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function getFileIcon(file: StorageFile): { icon: keyof typeof Ionicons["glyphMap"]; color: string } {
  if (file.isDir) return { icon: "folder-outline", color: "#f59e0b" };
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "md") return { icon: "document-text-outline", color: "#60a5fa" };
  if (ext === "yaml" || ext === "yml") return { icon: "settings-outline", color: "#a78bfa" };
  if (ext === "json") return { icon: "code-outline", color: "#22c55e" };
  if (ext === "log") return { icon: "list-outline", color: "#a1a1aa" };
  if (["png", "jpg", "gif", "webp"].includes(ext ?? "")) return { icon: "image-outline", color: "#ec4899" };
  return { icon: "document-outline", color: "#71717a" };
}

export default function StorageScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { connected } = useAuth();
  const { files: liveFiles, baseDir, loading, error, refresh, loadSubtree, deleteFile } = useStorage();
  const [expanded, setExpanded] = useState<Record<string, StorageFile[]>>({});
  const [loadingDir, setLoadingDir] = useState<string | null>(null);
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const rootFiles = connected && liveFiles.length > 0 ? liveFiles : MOCK_FILES.filter((f) => !f.path.slice(1).includes("/"));

  const handleDir = async (file: StorageFile) => {
    if (!file.isDir) return;
    if (expanded[file.path]) {
      setExpanded((prev) => { const n = { ...prev }; delete n[file.path]; return n; });
      return;
    }
    if (!connected) {
      setExpanded((prev) => ({ ...prev, [file.path]: MOCK_FILES.filter((f) => f.path.startsWith(file.path + "/") && !f.path.slice(file.path.length + 1).includes("/")) }));
      return;
    }
    setLoadingDir(file.path);
    try {
      const children = await loadSubtree(file.path);
      setExpanded((prev) => ({ ...prev, [file.path]: children }));
    } finally {
      setLoadingDir(null);
    }
  };

  const handleDelete = (file: StorageFile) => {
    if (file.protected) {
      Alert.alert("Không thể xóa", "File này được bảo vệ bởi hệ thống.");
      return;
    }
    Alert.alert("Xóa file", `Xóa "${file.name}"?`, [
      { text: "Hủy", style: "cancel" },
      { text: "Xóa", style: "destructive", onPress: () => deleteFile(file.path) },
    ]);
  };

  const totalSize = rootFiles.reduce((s, f) => s + f.size, 0);

  type FlatItem = { file: StorageFile; depth: number };
  const flatItems: FlatItem[] = [];
  const buildFlat = (files: StorageFile[], depth: number) => {
    for (const f of files) {
      flatItems.push({ file: f, depth });
      if (f.isDir && expanded[f.path]) {
        buildFlat(expanded[f.path], depth + 1);
      }
    }
  };
  buildFlat(rootFiles, 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 4 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.titleArea}>
          <Text style={[styles.title, { color: colors.foreground }]}>Storage</Text>
          {baseDir ? <Text style={[styles.basePath, { color: colors.mutedForeground }]}>{baseDir}</Text> : null}
        </View>
        <TouchableOpacity onPress={() => refresh()} style={[styles.iconBtn, { backgroundColor: colors.muted }]} activeOpacity={0.7}>
          {loading ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="refresh-outline" size={15} color={colors.mutedForeground} />}
        </TouchableOpacity>
      </View>

      {/* Stats bar */}
      <View style={[styles.statsBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.statItem}>
          <Ionicons name="folder-outline" size={14} color={colors.primary} />
          <Text style={[styles.statText, { color: colors.foreground }]}>{rootFiles.filter((f) => f.isDir).length} folders</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Ionicons name="document-outline" size={14} color={colors.primary} />
          <Text style={[styles.statText, { color: colors.foreground }]}>{rootFiles.filter((f) => !f.isDir).length} files</Text>
        </View>
        {totalSize > 0 && (
          <>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Ionicons name="save-outline" size={14} color={colors.primary} />
              <Text style={[styles.statText, { color: colors.foreground }]}>{fmtSize(totalSize)}</Text>
            </View>
          </>
        )}
      </View>

      {error && (
        <View style={[styles.errorBanner, { backgroundColor: colors.destructive + "15" }]}>
          <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
        </View>
      )}

      <FlatList
        data={flatItems}
        keyExtractor={(item) => item.file.path}
        renderItem={({ item }) => {
          const { file, depth } = item;
          const { icon, color } = getFileIcon(file);
          const isExpanded = !!expanded[file.path];
          const isLoadingThis = loadingDir === file.path;

          return (
            <TouchableOpacity
              onPress={() => handleDir(file)}
              onLongPress={() => handleDelete(file)}
              style={[styles.fileRow, { paddingLeft: 16 + depth * 20, borderBottomColor: colors.border }]}
              activeOpacity={0.7}
            >
              <View style={[styles.fileIcon, { backgroundColor: color + "18" }]}>
                <Ionicons name={icon} size={16} color={color} />
              </View>
              <View style={styles.fileInfo}>
                <Text style={[styles.fileName, { color: colors.foreground }]} numberOfLines={1}>{file.name}</Text>
                {file.size > 0 && (
                  <Text style={[styles.fileSize, { color: colors.mutedForeground }]}>{fmtSize(file.size)}</Text>
                )}
              </View>
              {file.protected && (
                <Ionicons name="lock-closed-outline" size={12} color={colors.mutedForeground} style={{ marginRight: 4 }} />
              )}
              {isLoadingThis ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : file.isDir ? (
                <Ionicons name={isExpanded ? "chevron-down" : "chevron-forward"} size={14} color={colors.mutedForeground} />
              ) : (
                <Ionicons name="chevron-forward" size={14} color={colors.border} />
              )}
            </TouchableOpacity>
          );
        }}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="folder-open-outline" size={36} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Không có files</Text>
          </View>
        }
        ListFooterComponent={
          <Text style={[styles.hint, { color: colors.mutedForeground }]}>Long press để xóa file</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingBottom: 8, gap: 8 },
  backBtn: { padding: 4 },
  titleArea: { flex: 1 },
  title: { fontSize: 20, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  basePath: { fontSize: 10, fontFamily: "monospace", marginTop: 1 },
  iconBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  statsBar: { flexDirection: "row", alignItems: "center", marginHorizontal: 16, marginBottom: 8, borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10 },
  statItem: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1, justifyContent: "center" },
  statText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  statDivider: { width: 1, height: 16 },
  errorBanner: { marginHorizontal: 16, marginBottom: 8, borderRadius: 10, padding: 10 },
  errorText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  list: {},
  fileRow: { flexDirection: "row", alignItems: "center", paddingRight: 16, paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth, gap: 10 },
  fileIcon: { width: 30, height: 30, borderRadius: 9, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  fileInfo: { flex: 1 },
  fileName: { fontSize: 14, fontFamily: "Inter_400Regular" },
  fileSize: { fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 1 },
  hint: { textAlign: "center", fontSize: 11, fontFamily: "Inter_400Regular", paddingVertical: 16 },
  emptyWrap: { alignItems: "center", paddingTop: 80, gap: 10 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
});
