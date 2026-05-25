import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
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
  { path: "/vault/knowledge/goclaw-overview.md", name: "goclaw-overview.md", isDir: false, size: 6400, protected: false },
  { path: "/vault/knowledge/api-reference.md", name: "api-reference.md", isDir: false, size: 12800, protected: false },
];

const MOCK_FILE_CONTENT: Record<string, string> = {
  "/config.yaml": `# GoClaw Config\nserver:\n  port: 8080\n  host: 0.0.0.0\ndatabase:\n  host: localhost\n  port: 5432\n  name: goclaw\nauth:\n  session_secret: "..."\n  jwt_ttl: 24h`,
  "/agents/assistant/workspace/notes.md": `# Assistant Notes\n\n## Recent Tasks\n- Analyzed Q1 sales data\n- Generated weekly report\n- Scheduled follow-up with team\n\n## Context\nThis is a persistent note file used by the assistant agent.`,
  "/agents/assistant/workspace/context.md": `# Agent Context\n\n## Role\nYou are a helpful assistant focused on business analytics.\n\n## Capabilities\n- Data analysis\n- Report generation\n- Email drafting\n- Calendar management`,
  "/vault/knowledge/goclaw-overview.md": `# GoClaw Platform Overview\n\nGoClaw is a multi-tenant AI agent platform.\n\n## Features\n- 20+ LLM providers\n- 7 messaging channels\n- 3-tier memory system\n- Real-time WebSocket API`,
};

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
  if (ext === "py") return { icon: "code-slash-outline", color: "#3b82f6" };
  if (ext === "go") return { icon: "code-slash-outline", color: "#06b6d4" };
  if (ext === "ts" || ext === "js") return { icon: "code-slash-outline", color: "#f59e0b" };
  return { icon: "document-outline", color: "#71717a" };
}

function FilePreviewModal({
  file,
  content,
  colors,
  onClose,
}: {
  file: StorageFile;
  content: string;
  colors: ReturnType<typeof useColors>;
  onClose: () => void;
}) {
  const { icon, color } = getFileIcon(file);
  const ext = file.name.split(".").pop()?.toLowerCase();
  const isCode = ["yaml", "yml", "json", "py", "go", "ts", "js", "sh"].includes(ext ?? "");

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[previewStyles.container, { backgroundColor: colors.background }]}>
        <View style={[previewStyles.header, { borderBottomColor: colors.border }]}>
          <View style={[previewStyles.fileIcon, { backgroundColor: color + "18" }]}>
            <Ionicons name={icon} size={18} color={color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[previewStyles.fileName, { color: colors.foreground }]}>{file.name}</Text>
            <Text style={[previewStyles.filePath, { color: colors.mutedForeground }]}>{file.path}</Text>
          </View>
          <View style={styles.headerRight}>
            {file.size > 0 && (
              <View style={[previewStyles.sizeBadge, { backgroundColor: colors.secondary }]}>
                <Text style={[previewStyles.sizeText, { color: colors.mutedForeground }]}>{fmtSize(file.size)}</Text>
              </View>
            )}
            <TouchableOpacity onPress={onClose} style={[previewStyles.closeBtn, { backgroundColor: colors.muted }]} activeOpacity={0.7}>
              <Ionicons name="close" size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
        </View>
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          <Text
            style={[
              previewStyles.content,
              isCode
                ? { backgroundColor: "#0f172a", color: "#e2e8f0", fontFamily: "monospace" }
                : { color: colors.foreground },
            ]}
            selectable
          >
            {content}
          </Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

export default function StorageScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { connected } = useAuth();
  const { files: liveFiles, baseDir, loading, error, refresh, loadSubtree, deleteFile } = useStorage();
  const [expanded, setExpanded] = useState<Record<string, StorageFile[]>>({});
  const [loadingDir, setLoadingDir] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [previewFile, setPreviewFile] = useState<StorageFile | null>(null);
  const topPad = insets.top;

  const rootFiles = connected ? liveFiles : (liveFiles.length > 0 ? liveFiles : MOCK_FILES);

  const handleDir = async (file: StorageFile) => {
    if (!file.isDir) {
      setPreviewFile(file);
      return;
    }
    if (expanded[file.path]) {
      setExpanded((prev) => { const n = { ...prev }; delete n[file.path]; return n; });
      return;
    }
    if (!connected) return;
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

  const allFiles = [
    ...rootFiles,
    ...Object.values(expanded).flat(),
  ];

  const searchFiltered = search
    ? allFiles.filter((f) => f.name.toLowerCase().includes(search.toLowerCase()) || f.path.toLowerCase().includes(search.toLowerCase()))
    : null;

  if (!search) buildFlat(rootFiles, 0);

  const displayItems: FlatItem[] = searchFiltered
    ? searchFiltered.map((f) => ({ file: f, depth: 0 }))
    : flatItems;

  const dirCount = rootFiles.filter((f) => f.isDir).length;
  const fileCount = rootFiles.filter((f) => !f.isDir).length;
  const totalSize = rootFiles.reduce((s, f) => s + f.size, 0);

  const previewContent = previewFile ? `# ${previewFile.name}\n\nFile path: ${previewFile.path}\nSize: ${previewFile.size} bytes\n\nNội dung file không khả dụng trên mobile.` : "";

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
        <TouchableOpacity
          style={[styles.iconBtn, { backgroundColor: showSearch ? colors.primary + "25" : colors.muted }]}
          onPress={() => { setShowSearch((v) => !v); if (showSearch) setSearch(""); }}
          activeOpacity={0.7}
        >
          <Ionicons name="search-outline" size={15} color={showSearch ? colors.primary : colors.mutedForeground} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => refresh()} style={[styles.iconBtn, { backgroundColor: colors.muted }]} activeOpacity={0.7}>
          {loading ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="refresh-outline" size={15} color={colors.mutedForeground} />}
        </TouchableOpacity>
      </View>

      {/* Search bar */}
      {showSearch && (
        <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={14} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Tìm file theo tên hoặc path..."
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
            autoFocus
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")} activeOpacity={0.7}>
              <Ionicons name="close-circle" size={15} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Stats bar */}
      <View style={[styles.statsBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.statItem}>
          <Ionicons name="folder-outline" size={13} color="#f59e0b" />
          <Text style={[styles.statText, { color: colors.foreground }]}>{dirCount} folders</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Ionicons name="document-outline" size={13} color="#60a5fa" />
          <Text style={[styles.statText, { color: colors.foreground }]}>{fileCount} files</Text>
        </View>
        {totalSize > 0 && (
          <>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Ionicons name="save-outline" size={13} color={colors.primary} />
              <Text style={[styles.statText, { color: colors.foreground }]}>{fmtSize(totalSize)}</Text>
            </View>
          </>
        )}
        {search && (
          <>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Ionicons name="search-outline" size={13} color={colors.primary} />
              <Text style={[styles.statText, { color: colors.primary }]}>{displayItems.length} found</Text>
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
        style={styles.list}
        data={displayItems}
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
              style={[styles.fileRow, { paddingLeft: search ? 16 : 16 + depth * 20, borderBottomColor: colors.border }]}
              activeOpacity={0.7}
            >
              {/* Depth connector lines */}
              {depth > 0 && !search && (
                <View style={[styles.depthLine, { left: 16 + (depth - 1) * 20 + 15, borderColor: colors.border }]} />
              )}

              <View style={[styles.fileIcon, { backgroundColor: color + "18" }]}>
                <Ionicons name={icon} size={16} color={color} />
              </View>
              <View style={styles.fileInfo}>
                <Text style={[styles.fileName, { color: colors.foreground }]} numberOfLines={1}>
                  {file.name}
                </Text>
                {(search && file.path !== `/${file.name}`) && (
                  <Text style={[styles.filePath, { color: colors.mutedForeground }]} numberOfLines={1}>
                    {file.path}
                  </Text>
                )}
                {file.size > 0 && (
                  <Text style={[styles.fileSize, { color: colors.mutedForeground }]}>{fmtSize(file.size)}</Text>
                )}
              </View>
              {file.protected && (
                <Ionicons name="lock-closed-outline" size={12} color={colors.mutedForeground} style={{ marginRight: 4 }} />
              )}
              {!file.isDir && !file.protected && (
                <Ionicons name="eye-outline" size={14} color={colors.mutedForeground} style={{ marginRight: 4 }} />
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
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="folder-open-outline" size={36} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              {search ? `Không tìm thấy "${search}"` : "Không có files"}
            </Text>
          </View>
        }
        ListFooterComponent={
          !search ? (
            <Text style={[styles.hint, { color: colors.mutedForeground }]}>Tap file để xem · Long press để xóa</Text>
          ) : null
        }
      />

      {previewFile && (
        <FilePreviewModal
          file={previewFile}
          content={previewContent}
          colors={colors}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </View>
  );
}

const previewStyles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 20, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth, gap: 10 },
  fileIcon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  fileName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  filePath: { fontSize: 10, fontFamily: "monospace", marginTop: 2 },
  sizeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  sizeText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  closeBtn: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  content: { flex: 1, padding: 16, fontSize: 13, lineHeight: 20, fontFamily: "Inter_400Regular" },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingBottom: 8, gap: 8 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  backBtn: { padding: 4 },
  titleArea: { flex: 1 },
  title: { fontSize: 20, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  basePath: { fontSize: 10, fontFamily: "monospace", marginTop: 1 },
  iconBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  searchBar: { flexDirection: "row", alignItems: "center", marginHorizontal: 14, marginBottom: 8, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, height: 40, gap: 8 },
  searchInput: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular" },
  statsBar: { flexDirection: "row", alignItems: "center", marginHorizontal: 16, marginBottom: 8, borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10 },
  statItem: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1, justifyContent: "center" },
  statText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  statDivider: { width: 1, height: 16 },
  errorBanner: { marginHorizontal: 16, marginBottom: 8, borderRadius: 10, padding: 10 },
  errorText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  list: { flex: 1 },
  fileRow: { flexDirection: "row", alignItems: "center", paddingRight: 16, paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth, gap: 10, position: "relative" },
  depthLine: { position: "absolute", top: 0, bottom: 0, width: 1, borderLeftWidth: StyleSheet.hairlineWidth },
  fileIcon: { width: 30, height: 30, borderRadius: 9, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  fileInfo: { flex: 1 },
  fileName: { fontSize: 14, fontFamily: "Inter_400Regular" },
  filePath: { fontSize: 9, fontFamily: "monospace", marginTop: 1 },
  fileSize: { fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 1 },
  hint: { textAlign: "center", fontSize: 11, fontFamily: "Inter_400Regular", paddingVertical: 16 },
  emptyWrap: { alignItems: "center", paddingTop: 80, gap: 10 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
});
