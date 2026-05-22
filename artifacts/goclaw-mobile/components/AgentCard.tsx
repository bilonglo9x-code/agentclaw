import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { Agent } from "@/context/AppContext";

const STATUS_CONFIG = {
  active: { color: "#22C55E", label: "Active" },
  idle: { color: "#F59E0B", label: "Idle" },
  summoning: { color: "#60A5FA", label: "Loading" },
  offline: { color: "#6B7280", label: "Offline" },
} as const;

const PROVIDER_ICONS: Record<string, { name: keyof typeof Ionicons["glyphMap"]; color: string }> = {
  Anthropic: { name: "sparkles", color: "#D97706" },
  OpenAI: { name: "logo-electron", color: "#10B981" },
  Google: { name: "logo-google", color: "#3B82F6" },
};

interface AgentCardProps {
  agent: Agent;
  onPress: () => void;
}

export function AgentCard({ agent, onPress }: AgentCardProps) {
  const colors = useColors();
  const statusCfg = STATUS_CONFIG[agent.status];
  const providerIcon = PROVIDER_ICONS[agent.provider] ?? { name: "hardware-chip-outline" as keyof typeof Ionicons["glyphMap"], color: colors.mutedForeground };

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={[styles.avatarWrap, { backgroundColor: colors.primary + "20" }]}>
        <Ionicons name={providerIcon.name} size={24} color={providerIcon.color} />
        <View style={[styles.statusDot, { backgroundColor: statusCfg.color }]} />
      </View>

      <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
        {agent.displayName}
      </Text>
      <Text style={[styles.desc, { color: colors.mutedForeground }]} numberOfLines={2}>
        {agent.description}
      </Text>

      <View style={styles.footer}>
        <View style={[styles.badge, { backgroundColor: colors.secondary }]}>
          <Text style={[styles.badgeText, { color: colors.mutedForeground }]}>
            {agent.type === "predefined" ? "System" : "Custom"}
          </Text>
        </View>
        <Text style={[styles.model, { color: colors.mutedForeground }]} numberOfLines={1}>
          {agent.model.split("-").slice(0, 2).join("-")}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 6,
  },
  avatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
    position: "relative",
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    position: "absolute",
    bottom: -2,
    right: -2,
    borderWidth: 2,
    borderColor: "white",
  },
  name: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  desc: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 16,
    flex: 1,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
  },
  model: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    maxWidth: 70,
  },
});
