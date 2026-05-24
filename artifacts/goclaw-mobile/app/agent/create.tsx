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
import { useModels } from "@/hooks/useModels";
import { useAuth } from "@/context/AuthContext";

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

  const { connected } = useAuth();
  const { createAgent, updateAgent, saving, error, clearError } = useCreateAgent();
  const { agent, loading: loadingAgent } = useAgentDetail(id);
  const { models: allModels, loading: modelsLoading } = useModels();

  const [showImport, setShowImport] = useState(false);
  const [importJson, setImportJson] = useState("");
  const [showModelPicker, setShowModelPicker] = useState(false);

  const [form, setForm] = useState<AgentFormData>({
    agent_key: "",
    name: "",
    agent_description: "",
    provider: "openai",
    model: "",
    agent_type: "predefined",
    context_window: 128000,
    max_tool_iterations: 10,
    temperature: 0.7,
    max_tokens: undefined,
    memory_enabled: false,
    embedding_provider: "",
    embedding_model: "",
    is_default: false,
    workspace: "",
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
        temperature: (agent as any).temperature ?? 0.7,
        max_tokens: (agent as any).max_tokens ?? undefined,
        memory_enabled: agent.memory_enabled ?? false,
        embedding_provider: agent.embedding_provider ?? "",
        embedding_model: agent.embedding_model ?? "",
        is_default: agent.is_default ?? false,
        workspace: agent.workspace ?? "",
        status: (agent.status as AgentFormData["status"]) ?? "active",
      });
    }
  }, [agent, isEdit]);

  const set = (field: keyof AgentFormData) => (val: string) =>
    setForm((f) => ({ ...f, [field]: val }));

  const topPad = insets.top;

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
              <TouchableOpacity
                onPress={() => setShowModelPicker(true)}
                activeOpacity={0.7}
                style={[styles.input, styles.modelPickerBtn, { backgroundColor: colors.secondary, borderColor: form.model ? colors.primary + "50" : colors.border }]}
              >
                <Ionicons name="hardware-chip-outline" size={14} color={form.model ? colors.primary : colors.mutedForeground} />
                <Text style={{ flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: form.model ? colors.foreground : colors.mutedForeground }}>
                  {form.model || "Chọn model..."}
                </Text>
                {modelsLoading
                  ? <ActivityIndicator size="small" color={colors.mutedForeground} />
                  : <Ionicons name="chevron-down" size={14} color={colors.mutedForeground} />}
              </TouchableOpacity>
              {/* Manual override text */}
              <TextInput
                style={[styles.inputSmall, { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.foreground, marginTop: 6 }]}
                value={form.model}
                onChangeText={set("model")}
                placeholder="Hoặc nhập model ID thủ công..."
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="none"
              />
            </FormField>

            {/* Model Picker Modal */}
            <Modal visible={showModelPicker} animationType="slide" transparent onRequestClose={() => setShowModelPicker(false)}>
              <View style={styles.modalOverlay}>
                <View style={[styles.modalBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.modalHeader}>
                    <Text style={[styles.modalTitle, { color: colors.foreground }]}>Chọn Model</Text>
                    <TouchableOpacity onPress={() => setShowModelPicker(false)}>
                      <Ionicons name="close" size={20} color={colors.mutedForeground} />
                    </TouchableOpacity>
                  </View>
                  <Text style={[styles.modalSub, { color: colors.mutedForeground }]}>
                    {form.provider} — {allModels.filter((m) => m.provider === form.provider).length} models
                  </Text>
                  <ScrollView style={{ maxHeight: 380 }}>
                    {allModels.filter((m) => m.provider === form.provider || !form.provider).length === 0
                      ? (
                        <Text style={[styles.modalSub, { color: colors.mutedForeground, textAlign: "center", marginTop: 24 }]}>
                          {connected ? "Không có model nào" : "Kết nối server để xem danh sách model"}
                        </Text>
                      )
                      : allModels
                          .filter((m) => m.provider === form.provider || !form.provider)
                          .map((m) => {
                            const active = form.model === m.name;
                            return (
                              <TouchableOpacity
                                key={m.name}
                                onPress={() => { setForm((f) => ({ ...f, model: m.name })); setShowModelPicker(false); }}
                                style={[styles.modelItem, { borderColor: active ? colors.primary + "50" : colors.border, backgroundColor: active ? colors.primary + "10" : "transparent" }]}
                                activeOpacity={0.7}
                              >
                                <View style={{ flex: 1, gap: 2 }}>
                                  <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: active ? colors.primary : colors.foreground }}>
                                    {m.display_name || m.name}
                                  </Text>
                                  <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: colors.mutedForeground }}>
                                    {m.name}{m.context_window ? ` · ${(m.context_window / 1000).toFixed(0)}k ctx` : ""}
                                  </Text>
                                  {m.capabilities && m.capabilities.length > 0 && (
                                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 2 }}>
                                      {m.capabilities.map((c) => (
                                        <View key={c} style={[styles.capBadge, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                                          <Text style={{ fontSize: 10, color: colors.mutedForeground, fontFamily: "Inter_400Regular" }}>{c}</Text>
                                        </View>
                                      ))}
                                    </View>
                                  )}
                                </View>
                                {active && <Ionicons name="checkmark-circle" size={18} color={colors.primary} />}
                                {m.is_default && !active && (
                                  <View style={[styles.capBadge, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "30" }]}>
                                    <Text style={{ fontSize: 10, color: colors.primary, fontFamily: "Inter_600SemiBold" }}>default</Text>
                                  </View>
                                )}
                              </TouchableOpacity>
                            );
                          })}
                  </ScrollView>
                </View>
              </View>
            </Modal>
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

            <FormField label="Temperature (0.0 – 2.0)">
              <View style={styles.numRow}>
                <TextInput
                  style={[styles.input, styles.numInput, { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.foreground }]}
                  value={String(form.temperature ?? 0.7)}
                  onChangeText={(v) => {
                    const n = parseFloat(v);
                    setForm((f) => ({ ...f, temperature: isNaN(n) ? 0.7 : Math.min(2, Math.max(0, n)) }));
                  }}
                  keyboardType="decimal-pad"
                  placeholderTextColor={colors.mutedForeground}
                />
                <View style={styles.tempPresets}>
                  {([0.0, 0.3, 0.7, 1.0, 1.5] as const).map((t) => (
                    <TouchableOpacity
                      key={t}
                      onPress={() => setForm((f) => ({ ...f, temperature: t }))}
                      style={[styles.presetBtn, { backgroundColor: form.temperature === t ? colors.primary + "20" : colors.secondary, borderColor: form.temperature === t ? colors.primary : colors.border }]}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.presetText, { color: form.temperature === t ? colors.primary : colors.mutedForeground }]}>{t}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <Text style={[styles.hint, { color: colors.mutedForeground }]}>
                {(form.temperature ?? 0.7) <= 0.3 ? "Xác định, ít sáng tạo" : (form.temperature ?? 0.7) <= 0.7 ? "Cân bằng (khuyến nghị)" : (form.temperature ?? 0.7) <= 1.2 ? "Sáng tạo hơn" : "Rất sáng tạo / random"}
              </Text>
            </FormField>

            <FormField label="Max Output Tokens">
              <TextInput
                style={[styles.input, { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.foreground }]}
                value={form.max_tokens != null ? String(form.max_tokens) : ""}
                onChangeText={(v) => setForm((f) => ({ ...f, max_tokens: v ? parseInt(v) || undefined : undefined }))}
                keyboardType="numeric"
                placeholder="Để trống = dùng default của model"
                placeholderTextColor={colors.mutedForeground}
              />
            </FormField>

            <FormField label="Workspace Path">
              <TextInput
                style={[styles.input, { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.foreground, fontFamily: "monospace" }]}
                value={form.workspace ?? ""}
                onChangeText={set("workspace")}
                placeholder="vd: /agents/my-agent"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="none"
                autoCorrect={false}
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

            {/* is_default toggle */}
            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <Text style={[styles.toggleLabel, { color: colors.foreground }]}>Agent mặc định</Text>
                <Text style={[styles.toggleDesc, { color: colors.mutedForeground }]}>Agent này sẽ là default khi không chỉ định</Text>
              </View>
              <TouchableOpacity
                onPress={() => setForm((f) => ({ ...f, is_default: !f.is_default }))}
                style={[styles.toggleTrack, { backgroundColor: form.is_default ? colors.primary : colors.muted }]}
                activeOpacity={0.8}
              >
                <View style={[styles.toggleThumb, { transform: [{ translateX: form.is_default ? 18 : 2 }] }]} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Memory */}
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Memory</Text>

            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <Text style={[styles.toggleLabel, { color: colors.foreground }]}>Bật Memory</Text>
                <Text style={[styles.toggleDesc, { color: colors.mutedForeground }]}>Agent ghi nhớ ngữ cảnh giữa các phiên</Text>
              </View>
              <TouchableOpacity
                onPress={() => setForm((f) => ({ ...f, memory_enabled: !f.memory_enabled }))}
                style={[styles.toggleTrack, { backgroundColor: form.memory_enabled ? "#22c55e" : colors.muted }]}
                activeOpacity={0.8}
              >
                <View style={[styles.toggleThumb, { transform: [{ translateX: form.memory_enabled ? 18 : 2 }] }]} />
              </TouchableOpacity>
            </View>

            {form.memory_enabled && (
              <>
                <FormField label="Embedding Provider">
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.providerRow}>
                    {["openai", "ollama", "cohere", "huggingface"].map((p) => {
                      const active = form.embedding_provider === p;
                      return (
                        <TouchableOpacity
                          key={p}
                          onPress={() => setForm((f) => ({ ...f, embedding_provider: p }))}
                          style={[styles.providerChip, { backgroundColor: active ? "#22c55e18" : colors.secondary, borderColor: active ? "#22c55e" : colors.border }]}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.providerText, { color: active ? "#22c55e" : colors.mutedForeground }]}>{p}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </FormField>

                <FormField label="Embedding Model">
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.foreground }]}
                    value={form.embedding_model ?? ""}
                    onChangeText={set("embedding_model")}
                    placeholder={form.embedding_provider === "openai" ? "text-embedding-3-small" : form.embedding_provider === "ollama" ? "nomic-embed-text" : "Nhập model ID..."}
                    placeholderTextColor={colors.mutedForeground}
                    autoCapitalize="none"
                  />
                </FormField>
              </>
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
  modelPickerBtn: { flexDirection: "row", alignItems: "center", gap: 8 },
  inputSmall: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8, fontSize: 12, fontFamily: "Inter_400Regular" },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.6)" },
  modalBox: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, padding: 20, gap: 14 },
  modalHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  modalTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  modalSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  modelItem: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 6 },
  capBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
  numRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  numInput: { width: 80 },
  tempPresets: { flexDirection: "row", gap: 6, flex: 1 },
  presetBtn: { flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  presetText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  toggleInfo: { flex: 1 },
  toggleLabel: { fontSize: 14, fontFamily: "Inter_500Medium" },
  toggleDesc: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  toggleTrack: { width: 42, height: 24, borderRadius: 12, justifyContent: "center", paddingHorizontal: 2 },
  toggleThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: "#fff" },
});
