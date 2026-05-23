import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
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
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useCreateAgent, AgentFormData } from "@/hooks/useCreateAgent";
import { useAgentDetail } from "@/hooks/useAgentDetail";

const AGENT_TYPES = [
  { value: "predefined", label: "Predefined", icon: "planet-outline" as const, desc: "Agent được cấu hình sẵn với prompt cụ thể" },
  { value: "personal", label: "Personal", icon: "person-outline" as const, desc: "Agent riêng tư cho từng user" },
  { value: "shared", label: "Shared", icon: "people-outline" as const, desc: "Agent dùng chung trong team" },
  { value: "assistant", label: "Assistant", icon: "chatbubble-ellipses-outline" as const, desc: "Assistant tổng quát" },
];

const PROVIDERS = ["openai", "anthropic", "gemini", "groq", "together", "mistral", "ollama"];

function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <View style={fieldStyles.wrap}>
      <Text style={fieldStyles.label}>{label}{required && <Text style={fieldStyles.req}> *</Text>}</Text>
      {children}
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#a1a1aa", textTransform: "uppercase", letterSpacing: 0.5 },
  req: { color: "#f97316" },
});

export default function AgentCreateScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = !!id;

  const { createAgent, updateAgent, saving, error, clearError } = useCreateAgent();
  const { agent, loading: loadingAgent } = useAgentDetail(id);

  const [showImport, setShowImport] = useState(false);
  const [importJson, setImportJson] = useState("");

  const [form, setForm] = useState<AgentFormData>({
    agent_key: "",
    name: "",
    agent_description: "",
    provider: "openai",
    model: "",
    agent_type: "predefined",
    context_window: 128000,
    max_tool_iterations: 10,
    status: "active",
  });

  useEffect(() => {
    if (agent && isEdit) {
      setForm({
        agent_key: agent.agent_key ?? "",
        name: agent.name ?? "",
        agent_description: agent.description ?? "",
        provider: agent.provider ?? "openai",
        model: agent.model ?? "",
        agent_type: (agent.agent_type as AgentFormData["agent_type"]) ?? "predefined",
        context_window: agent.context_window ?? 128000,
        max_tool_iterations: agent.max_tool_iterations ?? 10,
        status: (agent.status as AgentFormData["status"]) ?? "active",
      });
    }
  }, [agent, isEdit]);

  const set = (field: keyof AgentFormData) => (val: string) =>
    setForm((f) => ({ ...f, [field]: val }));

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const handleImport = () => {
    try {
      const parsed = JSON.parse(importJson.trim());
      setForm((f) => ({
        ...f,
        agent_key: parsed.agent_key ?? parsed.key ?? f.agent_key,
        name: parsed.name ?? parsed.display_name ?? f.name,
        agent_description: parsed.agent_description ?? parsed.description ?? parsed.system_prompt ?? f.agent_description,
        provider: parsed.provider ?? f.provider,
        model: parsed.model ?? f.model,
        agent_type: parsed.agent_type ?? parsed.type ?? f.agent_type,
        context_window: parsed.context_window ?? f.context_window,
        max_tool_iterations: parsed.max_tool_iterations ?? f.max_tool_iterations,
        status: parsed.status ?? f.status,
      }));
      setShowImport(false);
      setImportJson("");
    } catch {
      Alert.alert("JSON không hợp lệ", "Kiểm tra lại định dạng JSON cấu hình agent");
    }
  };

  const handleSave = async () => {
    clearError();
    if (!form.agent_key.trim()) {
      Alert.alert("Thiếu thông tin", "Agent key là bắt buộc");
      return;
    }
    if (isEdit && id) {
      const ok = await updateAgent(id, form);
      if (ok) {
        Alert.alert("Thành công", "Đã cập nhật agent", [{ text: "OK", onPress: () => router.back() }]);
      }
    } else {
      const res = await createAgent(form);
      if (res) {
        Alert.alert("Tạo thành công", `Agent "${res.agent_key}" đã được tạo`, [
          { text: "Xem chi tiết", onPress: () => { router.back(); router.push(`/agent/${res.id}`); } },
          { text: "OK", onPress: () => router.back() },
        ]);
      }
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 4, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>
          {isEdit ? "Sửa Agent" : "Tạo Agent mới"}
        </Text>
        {!isEdit && (
          <TouchableOpacity
            onPress={() => setShowImport(true)}
            style={[styles.importBtn, { backgroundColor: colors.muted }]}
            activeOpacity={0.7}
          >
            <Ionicons name="cloud-download-outline" size={14} color={colors.mutedForeground} />
            <Text style={[styles.importBtnText, { color: colors.mutedForeground }]}>Import</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          style={[styles.saveBtn, { backgroundColor: saving ? colors.muted : colors.primary }]}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>Lưu</Text>
          )}
        </TouchableOpacity>
      </View>

      {loadingAgent && isEdit ? (
        <View style={styles.centerWrap}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {error && (
            <View style={[styles.errorBanner, { backgroundColor: colors.destructive + "15", borderColor: colors.destructive + "30" }]}>
              <Ionicons name="alert-circle-outline" size={14} color={colors.destructive} />
              <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
            </View>
          )}

          {/* Basic info */}
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Thông tin cơ bản</Text>

            <FormField label="Agent Key" required>
              <TextInput
                style={[styles.input, { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.foreground }]}
                value={form.agent_key}
                onChangeText={set("agent_key")}
                placeholder="vd: sales-assistant"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="none"
                editable={!isEdit}
              />
              <Text style={[styles.hint, { color: colors.mutedForeground }]}>Chỉ dùng chữ thường, số và dấu gạch ngang</Text>
            </FormField>

            <FormField label="Tên hiển thị">
              <TextInput
                style={[styles.input, { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.foreground }]}
                value={form.name}
                onChangeText={set("name")}
                placeholder="vd: Sales Assistant"
                placeholderTextColor={colors.mutedForeground}
              />
            </FormField>

            <FormField label="Mô tả / System Prompt">
              <TextInput
                style={[styles.input, styles.textarea, { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.foreground }]}
                value={form.agent_description}
                onChangeText={set("agent_description")}
                placeholder="Mô tả nhiệm vụ và hành vi của agent..."
                placeholderTextColor={colors.mutedForeground}
                multiline
                numberOfLines={4}
              />
            </FormField>
          </View>

          {/* Agent type */}
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Loại Agent</Text>
            <View style={styles.typeGrid}>
              {AGENT_TYPES.map((t) => {
                const active = form.agent_type === t.value;
                return (
                  <TouchableOpacity
                    key={t.value}
                    onPress={() => setForm((f) => ({ ...f, agent_type: t.value as AgentFormData["agent_type"] }))}
                    style={[styles.typeCard, { backgroundColor: active ? colors.primary + "18" : colors.secondary, borderColor: active ? colors.primary + "60" : colors.border }]}
                    activeOpacity={0.7}
                  >
                    <Ionicons name={t.icon} size={18} color={active ? colors.primary : colors.mutedForeground} />
                    <Text style={[styles.typeLabel, { color: active ? colors.primary : colors.foreground }]}>{t.label}</Text>
                    <Text style={[styles.typeDesc, { color: colors.mutedForeground }]} numberOfLines={2}>{t.desc}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Model */}
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Model & Provider</Text>

            <FormField label="Provider">
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.providerRow}>
                {PROVIDERS.map((p) => {
                  const active = form.provider === p;
                  return (
                    <TouchableOpacity
                      key={p}
                      onPress={() => setForm((f) => ({ ...f, provider: p }))}
                      style={[styles.providerChip, { backgroundColor: active ? colors.primary + "18" : colors.secondary, borderColor: active ? colors.primary : colors.border }]}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.providerText, { color: active ? colors.primary : colors.mutedForeground }]}>{p}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </FormField>

            <FormField label="Model ID">
              <TextInput
                style={[styles.input, { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.foreground }]}
                value={form.model}
                onChangeText={set("model")}
                placeholder="vd: gpt-4o, claude-3-5-sonnet..."
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="none"
              />
            </FormField>
          </View>

          {/* Advanced */}
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Nâng cao</Text>

            <FormField label="Context Window (tokens)">
              <TextInput
                style={[styles.input, { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.foreground }]}
                value={String(form.context_window ?? 128000)}
                onChangeText={(v) => setForm((f) => ({ ...f, context_window: parseInt(v) || 128000 }))}
                keyboardType="numeric"
                placeholderTextColor={colors.mutedForeground}
              />
            </FormField>

            <FormField label="Max Tool Iterations">
              <TextInput
                style={[styles.input, { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.foreground }]}
                value={String(form.max_tool_iterations ?? 10)}
                onChangeText={(v) => setForm((f) => ({ ...f, max_tool_iterations: parseInt(v) || 10 }))}
                keyboardType="numeric"
                placeholderTextColor={colors.mutedForeground}
              />
            </FormField>

            {isEdit && (
              <FormField label="Trạng thái">
                <View style={styles.statusRow}>
                  {(["active", "inactive"] as const).map((s) => {
                    const active = form.status === s;
                    const color = s === "active" ? "#22c55e" : "#a1a1aa";
                    return (
                      <TouchableOpacity
                        key={s}
                        onPress={() => setForm((f) => ({ ...f, status: s }))}
                        style={[styles.statusChip, { backgroundColor: active ? color + "20" : colors.secondary, borderColor: active ? color : colors.border }]}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.statusDot, { backgroundColor: active ? color : colors.mutedForeground }]} />
                        <Text style={[styles.statusText, { color: active ? color : colors.mutedForeground }]}>
                          {s === "active" ? "Active" : "Inactive"}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </FormField>
            )}
          </View>
        </ScrollView>
      )}

      {/* Import Agent Modal */}
      <Modal visible={showImport} transparent animationType="slide" onRequestClose={() => setShowImport(false)}>
        <View style={styles.importOverlay}>
          <View style={[styles.importContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.importHeader}>
              <Text style={[styles.importTitle, { color: colors.foreground }]}>Import Agent Config</Text>
              <TouchableOpacity onPress={() => setShowImport(false)} activeOpacity={0.7}>
                <Ionicons name="close" size={22} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.importHint, { color: colors.mutedForeground }]}>
              Dán JSON cấu hình agent. Hỗ trợ trường: agent_key, name, description, provider, model, agent_type, context_window.
            </Text>
            <TextInput
              style={[styles.importTextarea, { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.foreground }]}
              value={importJson}
              onChangeText={setImportJson}
              placeholder={'{\n  "agent_key": "my-agent",\n  "provider": "openai",\n  "model": "gpt-4o"\n}'}
              placeholderTextColor={colors.mutedForeground}
              multiline
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={[styles.importApplyBtn, { backgroundColor: colors.primary, opacity: importJson.trim() ? 1 : 0.5 }]}
              onPress={handleImport}
              disabled={!importJson.trim()}
              activeOpacity={0.7}
            >
              <Ionicons name="cloud-download-outline" size={16} color="#fff" />
              <Text style={styles.importApplyText}>Áp dụng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingBottom: 10, gap: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  backBtn: { padding: 4 },
  title: { flex: 1, fontSize: 17, fontFamily: "Inter_600SemiBold" },
  importBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  importBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  importOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.65)" },
  importContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, padding: 20, gap: 12 },
  importHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  importTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  importHint: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  importTextarea: { borderRadius: 12, borderWidth: 1, padding: 12, fontSize: 12, fontFamily: "Inter_400Regular", minHeight: 160, textAlignVertical: "top" },
  importApplyBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 14, paddingVertical: 13 },
  importApplyText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  saveBtn: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, minWidth: 60, alignItems: "center" },
  saveBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#fff" },
  centerWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: 16, gap: 14 },
  errorBanner: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 12, borderWidth: 1, padding: 12 },
  errorText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
  section: { borderRadius: 18, borderWidth: 1, padding: 16, gap: 14 },
  sectionTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  input: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 13, paddingVertical: 10, fontSize: 14, fontFamily: "Inter_400Regular" },
  textarea: { height: 100, textAlignVertical: "top", paddingTop: 10 },
  hint: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: -2 },
  typeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  typeCard: { width: "47%", borderRadius: 14, borderWidth: 1, padding: 12, gap: 4 },
  typeLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  typeDesc: { fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 15 },
  filterScroll: { flexGrow: 0, flexShrink: 0 },
  providerRow: { flexDirection: "row", gap: 8, paddingVertical: 2, alignItems: "center" },
  providerChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, alignSelf: "flex-start" },
  providerText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  statusRow: { flexDirection: "row", gap: 10 },
  statusChip: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 12, borderWidth: 1, paddingVertical: 9 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
});
