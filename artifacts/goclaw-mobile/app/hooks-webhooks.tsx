import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
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

interface HookConfig {
  id: string;
  name?: string;
  event: string;
  handler_type: "command" | "http" | "prompt" | "script";
  scope: "global" | "tenant" | "agent";
  config: Record<string, unknown>;
  matcher?: string;
  timeout_ms: number;
  priority: number;
  enabled: boolean;
  source: string;
  created_at: string;
  updated_at: string;
}

const EVENT_CONFIG: Record<string, { color: string; label: string }> = {
  session_start: { color: "#22c55e", label: "Session Start" },
  user_prompt_submit: { color: "#60a5fa", label: "User Prompt" },
  pre_tool_use: { color: "#f59e0b", label: "Pre Tool" },
  post_tool_use: { color: "#f97316", label: "Post Tool" },
  stop: { color: "#ef4444", label: "Stop" },
  subagent_start: { color: "#a78bfa", label: "Subagent Start" },
  subagent_stop: { color: "#ec4899", label: "Subagent Stop" },
};

const HANDLER_CONFIG: Record<string, { icon: keyof typeof Ionicons["glyphMap"]; color: string; label: string }> = {
  http: { icon: "globe-outline", color: "#60a5fa", label: "HTTP" },
  command: { icon: "terminal-outline", color: "#a78bfa", label: "Command" },
  prompt: { icon: "chatbubble-outline", color: "#f59e0b", label: "Prompt" },
  script: { icon: "code-slash-outline", color: "#22c55e", label: "Script" },
};

const HOOK_EVENTS = [
  "session_start", "user_prompt_submit", "pre_tool_use",
  "post_tool_use", "stop", "subagent_start", "subagent_stop",
];

function fmtDate(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  if (diff < 60000) return "Vừa xong";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}p`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  return `${Math.floor(diff / 86400000)}d`;
}

interface HookFormState {
  name: string;
  event: string;
  handler_type: "command" | "http" | "prompt" | "script";
  scope: "global" | "tenant" | "agent";
  enabled: boolean;
  priority: string;
  timeout_ms: string;
  matcher: string;
  url: string;
  command: string;
  prompt_template: string;
  script_source: string;
}

const DEFAULT_FORM: HookFormState = {
  name: "",
  event: "user_prompt_submit",
  handler_type: "http",
  scope: "global",
  enabled: true,
  priority: "10",
  timeout_ms: "5000",
  matcher: "",
  url: "",
  command: "",
  prompt_template: "",
  script_source: "",
};

function HookFormModal({
  hook,
  colors,
  insets,
  onSave,
  onClose,
}: {
  hook: HookConfig | null;
  colors: ReturnType<typeof useColors>;
  insets: ReturnType<typeof useSafeAreaInsets>;
  onSave: (data: HookFormState) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<HookFormState>(() => {
    if (!hook) return DEFAULT_FORM;
    return {
      name: hook.name ?? "",
      event: hook.event,
      handler_type: hook.handler_type,
      scope: hook.scope,
      enabled: hook.enabled,
      priority: String(hook.priority),
      timeout_ms: String(hook.timeout_ms),
      matcher: hook.matcher ?? "",
      url: (hook.config.url as string) ?? "",
      command: (hook.config.command as string) ?? "",
      prompt_template: (hook.config.prompt_template as string) ?? "",
      script_source: (hook.config.source as string) ?? "",
    };
  });
  const [saving, setSaving] = useState(false);
  const set = (k: keyof HookFormState, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try { await onSave(form); onClose(); }
    catch {} finally { setSaving(false); }
  };

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={[fStyles.container, { backgroundColor: colors.background }]}>
          <View style={[fStyles.header, { borderBottomColor: colors.border }]}>
            <Text style={[fStyles.title, { color: colors.foreground }]}>{hook ? "Sửa Hook" : "Tạo Hook"}</Text>
            <TouchableOpacity onPress={onClose} style={[fStyles.closeBtn, { backgroundColor: colors.muted }]} activeOpacity={0.7}>
              <Ionicons name="close" size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: insets.bottom + 80 }}>
            {/* Name */}
            <View style={fStyles.field}>
              <Text style={[fStyles.label, { color: colors.mutedForeground }]}>Tên</Text>
              <TextInput style={[fStyles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.secondary }]} value={form.name} onChangeText={(v) => set("name", v)} placeholder="Tên hook (tùy chọn)" placeholderTextColor={colors.mutedForeground} />
            </View>
            {/* Event */}
            <View style={fStyles.field}>
              <Text style={[fStyles.label, { color: colors.mutedForeground }]}>Event</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {HOOK_EVENTS.map((ev) => (
                    <TouchableOpacity key={ev} onPress={() => set("event", ev)} style={[fStyles.chip, { backgroundColor: form.event === ev ? colors.primary + "20" : colors.secondary, borderColor: form.event === ev ? colors.primary : colors.border }]} activeOpacity={0.7}>
                      <Text style={[fStyles.chipText, { color: form.event === ev ? colors.primary : colors.mutedForeground }]}>{EVENT_CONFIG[ev]?.label ?? ev}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
            {/* Handler type */}
            <View style={fStyles.field}>
              <Text style={[fStyles.label, { color: colors.mutedForeground }]}>Loại Handler</Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {(["http", "command", "prompt", "script"] as const).map((ht) => (
                  <TouchableOpacity key={ht} onPress={() => set("handler_type", ht)} style={[fStyles.chip, { flex: 1, justifyContent: "center", backgroundColor: form.handler_type === ht ? HANDLER_CONFIG[ht].color + "20" : colors.secondary, borderColor: form.handler_type === ht ? HANDLER_CONFIG[ht].color : colors.border }]} activeOpacity={0.7}>
                    <Ionicons name={HANDLER_CONFIG[ht].icon} size={14} color={form.handler_type === ht ? HANDLER_CONFIG[ht].color : colors.mutedForeground} />
                    <Text style={[fStyles.chipText, { color: form.handler_type === ht ? HANDLER_CONFIG[ht].color : colors.mutedForeground }]}>{HANDLER_CONFIG[ht].label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            {/* Handler-specific config */}
            {form.handler_type === "http" && (
              <View style={fStyles.field}>
                <Text style={[fStyles.label, { color: colors.mutedForeground }]}>URL</Text>
                <TextInput style={[fStyles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.secondary }]} value={form.url} onChangeText={(v) => set("url", v)} placeholder="https://example.com/webhook" placeholderTextColor={colors.mutedForeground} keyboardType="url" autoCapitalize="none" />
              </View>
            )}
            {form.handler_type === "command" && (
              <View style={fStyles.field}>
                <Text style={[fStyles.label, { color: colors.mutedForeground }]}>Command</Text>
                <TextInput style={[fStyles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.secondary, fontFamily: "monospace" }]} value={form.command} onChangeText={(v) => set("command", v)} placeholder="/path/to/script.sh" placeholderTextColor={colors.mutedForeground} autoCapitalize="none" />
              </View>
            )}
            {form.handler_type === "prompt" && (
              <View style={fStyles.field}>
                <Text style={[fStyles.label, { color: colors.mutedForeground }]}>Prompt Template</Text>
                <TextInput style={[fStyles.input, fStyles.textarea, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.secondary }]} value={form.prompt_template} onChangeText={(v) => set("prompt_template", v)} placeholder="Phân tích nội dung: {{input}}" placeholderTextColor={colors.mutedForeground} multiline numberOfLines={4} />
              </View>
            )}
            {form.handler_type === "script" && (
              <View style={fStyles.field}>
                <Text style={[fStyles.label, { color: colors.mutedForeground }]}>Script Source (JS)</Text>
                <TextInput style={[fStyles.input, fStyles.textarea, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.secondary, fontFamily: "monospace" }]} value={form.script_source} onChangeText={(v) => set("script_source", v)} placeholder="// return { decision: 'allow' };" placeholderTextColor={colors.mutedForeground} multiline numberOfLines={6} autoCapitalize="none" />
              </View>
            )}
            {/* Matcher */}
            <View style={fStyles.field}>
              <Text style={[fStyles.label, { color: colors.mutedForeground }]}>Matcher (regex, tùy chọn)</Text>
              <TextInput style={[fStyles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.secondary, fontFamily: "monospace" }]} value={form.matcher} onChangeText={(v) => set("matcher", v)} placeholder="^/admin" placeholderTextColor={colors.mutedForeground} autoCapitalize="none" />
            </View>
            {/* Enabled + priority */}
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={[fStyles.field, { flex: 1 }]}>
                <Text style={[fStyles.label, { color: colors.mutedForeground }]}>Priority</Text>
                <TextInput style={[fStyles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.secondary }]} value={form.priority} onChangeText={(v) => set("priority", v)} keyboardType="number-pad" />
              </View>
              <View style={[fStyles.field, { flex: 1 }]}>
                <Text style={[fStyles.label, { color: colors.mutedForeground }]}>Timeout (ms)</Text>
                <TextInput style={[fStyles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.secondary }]} value={form.timeout_ms} onChangeText={(v) => set("timeout_ms", v)} keyboardType="number-pad" />
              </View>
            </View>
            <View style={[fStyles.switchRow, { borderColor: colors.border }]}>
              <Text style={[fStyles.switchLabel, { color: colors.foreground }]}>Kích hoạt hook</Text>
              <Switch value={form.enabled} onValueChange={(v) => set("enabled", v)} trackColor={{ true: colors.primary }} />
            </View>
          </ScrollView>
          <View style={[fStyles.footer, { borderTopColor: colors.border, paddingBottom: insets.bottom + 10 }]}>
            <TouchableOpacity style={[fStyles.cancelBtn, { borderColor: colors.border }]} onPress={onClose} activeOpacity={0.7}>
              <Text style={[fStyles.cancelText, { color: colors.foreground }]}>Hủy</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[fStyles.saveBtn, { backgroundColor: colors.primary, opacity: saving ? 0.7 : 1 }]} onPress={handleSave} disabled={saving} activeOpacity={0.8}>
              {saving ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="checkmark-outline" size={16} color="#fff" />}
              <Text style={fStyles.saveText}>{saving ? "Đang lưu..." : "Lưu"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const fStyles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 20, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  title: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  closeBtn: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  field: { gap: 6 },
  label: { fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: "Inter_400Regular" },
  textarea: { minHeight: 80, textAlignVertical: "top" },
  chip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  chipText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12 },
  switchLabel: { fontSize: 14, fontFamily: "Inter_400Regular" },
  footer: { flexDirection: "row", gap: 12, paddingHorizontal: 16, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  cancelBtn: { flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 13, alignItems: "center", justifyContent: "center" },
  cancelText: { fontSize: 15, fontFamily: "Inter_500Medium" },
  saveBtn: { flex: 2, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 12, paddingVertical: 13 },
  saveText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#fff" },
});

export default function HooksScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { http, connected, ws } = useAuth();
  const [hooks, setHooks] = useState<HookConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [editHook, setEditHook] = useState<HookConfig | null | "new">(null);
  const topPad = insets.top;

  const loadHooks = useCallback(async () => {
    if (!ws || !connected) return;
    setLoading(true);
    try {
      const res = await ws.call<{ hooks: HookConfig[] }>("hooks.list", {});
      setHooks(res.hooks ?? []);
    } catch {}
    finally { setLoading(false); }
  }, [ws, connected]);

  useEffect(() => { loadHooks(); }, [loadHooks]);

  const handleRefresh = async () => { setRefreshing(true); await loadHooks(); setRefreshing(false); };

  const handleToggle = async (hook: HookConfig) => {
    if (!http) return;
    try {
      await http.patch(`/v1/hooks/${hook.id}`, { enabled: !hook.enabled });
      setHooks((prev) => prev.map((h) => h.id === hook.id ? { ...h, enabled: !h.enabled } : h));
    } catch {}
  };

  const handleDelete = (hook: HookConfig) => {
    Alert.alert("Xóa Hook", `Xóa hook "${hook.name || hook.event}"?`, [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa", style: "destructive",
        onPress: async () => {
          if (!http) return;
          try {
            await http.delete(`/v1/hooks/${hook.id}`);
            setHooks((prev) => prev.filter((h) => h.id !== hook.id));
          } catch {}
        },
      },
    ]);
  };

  const handleSave = async (data: HookFormState) => {
    if (!http) return;
    let config: Record<string, unknown> = {};
    if (data.handler_type === "http") config = { url: data.url, method: "POST" };
    else if (data.handler_type === "command") config = { command: data.command };
    else if (data.handler_type === "prompt") config = { prompt_template: data.prompt_template };
    else if (data.handler_type === "script") config = { source: data.script_source };

    const body = {
      name: data.name || undefined,
      event: data.event,
      handler_type: data.handler_type,
      scope: data.scope,
      matcher: data.matcher || undefined,
      timeout_ms: Number(data.timeout_ms) || 5000,
      priority: Number(data.priority) || 10,
      enabled: data.enabled,
      config,
    };

    if (editHook && editHook !== "new") {
      await http.put(`/v1/hooks/${editHook.id}`, body);
    } else {
      await http.post("/v1/hooks", body);
    }
    await loadHooks();
  };

  const filtered = hooks.filter((h) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (h.name ?? "").toLowerCase().includes(q) || h.event.includes(q) || h.handler_type.includes(q);
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 4, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>Webhooks</Text>
        <TouchableOpacity onPress={loadHooks} style={[styles.iconBtn, { backgroundColor: colors.muted }]} activeOpacity={0.7}>
          {loading ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="refresh-outline" size={15} color={colors.mutedForeground} />}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setEditHook("new")} style={[styles.iconBtn, { backgroundColor: colors.primary }]} activeOpacity={0.7}>
          <Ionicons name="add" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Ionicons name="search-outline" size={14} color={colors.mutedForeground} />
        <TextInput
          style={[styles.searchInput, { color: colors.foreground }]}
          placeholder="Tìm kiếm hook..."
          placeholderTextColor={colors.mutedForeground}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")} activeOpacity={0.7}>
            <Ionicons name="close-circle" size={15} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}
      </View>

      {/* Stats */}
      <View style={[styles.statsRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.statsText, { color: colors.mutedForeground }]}>
          {filtered.length} hooks · {hooks.filter((h) => h.enabled).length} active
        </Text>
      </View>

      {!connected ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={40} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Chưa kết nối server</Text>
        </View>
      ) : (
        <FlatList
          style={{ flex: 1 }}
          data={filtered}
          keyExtractor={(h) => h.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
          contentContainerStyle={{ paddingBottom: insets.bottom + 40, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item: h }) => {
            const ev = EVENT_CONFIG[h.event];
            const ht = HANDLER_CONFIG[h.handler_type];
            return (
              <TouchableOpacity
                style={[styles.hookRow, { borderBottomColor: colors.border, opacity: h.enabled ? 1 : 0.55 }]}
                onPress={() => setEditHook(h)}
                onLongPress={() => handleDelete(h)}
                activeOpacity={0.8}
              >
                <View style={[styles.htIcon, { backgroundColor: ht.color + "20" }]}>
                  <Ionicons name={ht.icon} size={16} color={ht.color} />
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Text style={[styles.hookName, { color: colors.foreground }]} numberOfLines={1}>
                      {h.name || ht.label}
                    </Text>
                    {h.source !== "ui" && (
                      <View style={[styles.sourceBadge, { backgroundColor: colors.secondary }]}>
                        <Text style={[styles.sourceText, { color: colors.mutedForeground }]}>{h.source}</Text>
                      </View>
                    )}
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <View style={[styles.evBadge, { backgroundColor: (ev?.color ?? "#a1a1aa") + "20" }]}>
                      <Text style={[styles.evText, { color: ev?.color ?? "#a1a1aa" }]}>{ev?.label ?? h.event}</Text>
                    </View>
                    <Text style={[styles.scopeText, { color: colors.mutedForeground }]}>{h.scope}</Text>
                    <Text style={[styles.metaText, { color: colors.mutedForeground }]}>p{h.priority}</Text>
                    {h.matcher && <Text style={[styles.matcherText, { color: colors.mutedForeground }]} numberOfLines={1}>{h.matcher}</Text>}
                  </View>
                </View>
                <Switch
                  value={h.enabled}
                  onValueChange={() => handleToggle(h)}
                  trackColor={{ true: colors.primary }}
                  style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                />
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.center}>
                <Ionicons name="git-branch-outline" size={44} color={colors.mutedForeground} />
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Chưa có webhook</Text>
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Nhấn + để tạo hook đầu tiên</Text>
              </View>
            ) : null
          }
        />
      )}

      {editHook !== null && (
        <HookFormModal
          hook={editHook === "new" ? null : editHook}
          colors={colors}
          insets={insets}
          onSave={handleSave}
          onClose={() => setEditHook(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth, gap: 8 },
  backBtn: { padding: 4 },
  title: { flex: 1, fontSize: 17, fontFamily: "Inter_600SemiBold" },
  iconBtn: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  searchBar: { flexDirection: "row", alignItems: "center", marginHorizontal: 14, marginTop: 10, marginBottom: 6, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, height: 40, gap: 8 },
  searchInput: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular" },
  statsRow: { marginHorizontal: 14, marginBottom: 8, borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8 },
  statsText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60, gap: 10 },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  hookRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 },
  htIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  hookName: { fontSize: 14, fontFamily: "Inter_500Medium", flex: 1 },
  sourceBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  sourceText: { fontSize: 9, fontFamily: "Inter_400Regular" },
  evBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 },
  evText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  scopeText: { fontSize: 10, fontFamily: "Inter_400Regular" },
  metaText: { fontSize: 10, fontFamily: "Inter_400Regular" },
  matcherText: { fontSize: 10, fontFamily: "monospace", flex: 1 },
});
