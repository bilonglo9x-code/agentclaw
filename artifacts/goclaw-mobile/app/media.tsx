import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { Share } from "react-native";
import { useColors } from "@/hooks/useColors";
import { useMedia, MediaFile } from "@/hooks/useMedia";
import { useAuth } from "@/context/AuthContext";

const MIME_ICON: Record<string, { icon: keyof typeof Ionicons["glyphMap"]; color: string }> = {
  "image": { icon: "image-outline", color: "#ec4899" },
  "audio": { icon: "musical-notes-outline", color: "#a78bfa" },
  "video": { icon: "videocam-outline", color: "#60a5fa" },
  "application": { icon: "document-outline", color: "#f59e0b" },
  "text": { icon: "document-text-outline", color: "#22c55e" },
};

function getMimeIcon(mime: string) {
  const main = mime.split("/")[0];
  return MIME_ICON[main] ?? { icon: "attach-outline" as keyof typeof Ionicons["glyphMap"], color: "#71717a" };
}

function fmtSize(bytes?: number): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

const MOCK_FILES: MediaFile[] = [
  { id: "m1", path: "/tmp/upload1.png", filename: "screenshot.png", mime_type: "image/png", size: 245760 },
  { id: "m2", path: "/tmp/upload2.mp3", filename: "voice_note.mp3", mime_type: "audio/mpeg", size: 1048576 },
  { id: "m3", path: "/tmp/upload3.pdf", filename: "report.pdf", mime_type: "application/pdf", size: 524288 },
];

export default function MediaScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { connected } = useAuth();
  const { files: liveFiles, loading, uploading, error, load, refresh, upload, getMediaUrl, deleteFile } = useMedia();
  const topPad = insets.top;

  const files = liveFiles;

  useEffect(() => {
    if (connected) load();
  }, [connected]);

  const handleUpload = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images", "videos"],
        quality: 0.85,
        allowsMultipleSelection: false,
      });
      if (result.canceled || !result.assets.length) return;
      const asset = result.assets[0];
      const filename = asset.fileName ?? `upload_${Date.now()}.jpg`;
      const mimeType = asset.mimeType ?? "image/jpeg";
      await upload(asset.uri, filename, mimeType);
      refresh();
    } catch (e) {
      Alert.alert("Lỗi upload", e instanceof Error ? e.message : "Không thể upload file");
    }
  };

  const handleCopyUrl = async (file: MediaFile) => {
    const url = file.url ?? getMediaUrl(file.id);
    await Share.share({ message: url, url });
    Alert.alert("Đã copy", url);
  };

  const handleDelete = (file: MediaFile) => {
    Alert.alert(
      "Xóa file",
      `Xóa "${file.filename}"? Hành động này không thể hoàn tác.`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteFile(file.id);
            } catch {
              Alert.alert("Lỗi", "Không thể xóa file");
            }
          },
        },
      ],
    );
  };

  const imageFiles = files.filter((f) => f.mime_type.startsWith("image/"));
  const otherFiles = files.filter((f) => !f.mime_type.startsWith("image/"));

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 4 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>Media Library</Text>
        <TouchableOpacity onPress={refresh} style={[styles.iconBtn, { backgroundColor: colors.muted }]} activeOpacity={0.7}>
          {loading ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="refresh-outline" size={15} color={colors.mutedForeground} />}
        </TouchableOpacity>
        {connected && (
          <TouchableOpacity
            onPress={handleUpload}
            style={[styles.iconBtn, { backgroundColor: colors.primary }]}
            disabled={uploading}
            activeOpacity={0.7}
          >
            {uploading ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="cloud-upload-outline" size={15} color="#fff" />}
          </TouchableOpacity>
        )}
      </View>

      {error && (
        <View style={[styles.errorBanner, { backgroundColor: colors.destructive + "15" }]}>
          <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
        </View>
      )}

      {/* Summary */}
      <View style={styles.summaryRow}>
        <View style={[styles.sumCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sumCount, { color: "#ec4899" }]}>{imageFiles.length}</Text>
          <Text style={[styles.sumLabel, { color: colors.mutedForeground }]}>Images</Text>
        </View>
        <View style={[styles.sumCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sumCount, { color: "#60a5fa" }]}>{otherFiles.length}</Text>
          <Text style={[styles.sumLabel, { color: colors.mutedForeground }]}>Other</Text>
        </View>
        <View style={[styles.sumCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sumCount, { color: colors.foreground }]}>{files.length}</Text>
          <Text style={[styles.sumLabel, { color: colors.mutedForeground }]}>Total</Text>
        </View>
      </View>

      <FlatList
        data={files}
        keyExtractor={(f) => f.id}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="images-outline" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              {connected ? "Chưa có media nào" : "Chưa kết nối"}
            </Text>
            {connected && (
              <TouchableOpacity onPress={handleUpload} activeOpacity={0.7}>
                <Text style={[styles.uploadLink, { color: colors.primary }]}>Upload file đầu tiên</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        renderItem={({ item }) => {
          const { icon, color } = getMimeIcon(item.mime_type);
          const isImage = item.mime_type.startsWith("image/");
          const mediaUrl = item.url ?? getMediaUrl(item.id);
          return (
            <View style={[styles.fileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {isImage && connected ? (
                <Image source={{ uri: mediaUrl }} style={styles.thumbnail} />
              ) : (
                <View style={[styles.iconBox, { backgroundColor: color + "20" }]}>
                  <Ionicons name={icon} size={22} color={color} />
                </View>
              )}
              <View style={styles.fileInfo}>
                <Text style={[styles.filename, { color: colors.foreground }]} numberOfLines={1}>{item.filename}</Text>
                <View style={styles.metaRow}>
                  <Text style={[styles.mimeText, { color: color }]}>{item.mime_type}</Text>
                  <Text style={[styles.dot, { color: colors.border }]}>·</Text>
                  <Text style={[styles.sizeText, { color: colors.mutedForeground }]}>{fmtSize(item.size)}</Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => handleCopyUrl(item)}
                style={[styles.copyBtn, { backgroundColor: colors.muted }]}
                activeOpacity={0.7}
              >
                <Ionicons name="copy-outline" size={14} color={colors.mutedForeground} />
              </TouchableOpacity>
              {connected && (
                <TouchableOpacity
                  onPress={() => handleDelete(item)}
                  style={[styles.copyBtn, { backgroundColor: "#ef444415" }]}
                  activeOpacity={0.7}
                >
                  <Ionicons name="trash-outline" size={14} color="#ef4444" />
                </TouchableOpacity>
              )}
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingBottom: 10, gap: 8 },
  backBtn: { padding: 4 },
  title: { flex: 1, fontSize: 20, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  iconBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  errorBanner: { marginHorizontal: 16, marginBottom: 8, borderRadius: 10, padding: 10 },
  errorText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  summaryRow: { flexDirection: "row", gap: 10, paddingHorizontal: 16, marginBottom: 12 },
  sumCard: { flex: 1, borderRadius: 14, borderWidth: 1, padding: 12, alignItems: "center" },
  sumCount: { fontSize: 20, fontFamily: "Inter_700Bold" },
  sumLabel: { fontSize: 11, fontFamily: "Inter_500Medium", marginTop: 2 },
  list: { paddingHorizontal: 14, paddingTop: 4 },
  fileCard: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 16, borderWidth: 1, padding: 12 },
  thumbnail: { width: 50, height: 50, borderRadius: 12, flexShrink: 0 },
  iconBox: { width: 50, height: 50, borderRadius: 12, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  fileInfo: { flex: 1 },
  filename: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 4 },
  mimeText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  dot: { fontSize: 10 },
  sizeText: { fontSize: 10, fontFamily: "Inter_400Regular" },
  copyBtn: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  emptyWrap: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  uploadLink: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
