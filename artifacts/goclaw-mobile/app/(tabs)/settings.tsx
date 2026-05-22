import React from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

interface RowProps {
  icon: keyof typeof Ionicons["glyphMap"];
  iconColor?: string;
  label: string;
  value?: string;
  toggle?: boolean;
  toggleValue?: boolean;
  onToggle?: (v: boolean) => void;
  danger?: boolean;
  onPress?: () => void;
}

function Row({ icon, iconColor, label, value, toggle, toggleValue, onToggle, danger, onPress }: RowProps) {
  const colors = useColors();
  const color = danger ? "#EF4444" : iconColor ?? colors.primary;

  return (
    <TouchableOpacity
      style={[styles.row, { borderBottomColor: colors.border }]}
      onPress={onPress}
      activeOpacity={toggle ? 1 : 0.7}
      disabled={toggle && !onPress}
    >
      <View style={[styles.rowIcon, { backgroundColor: color + "18" }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={[styles.rowLabel, { color: danger ? "#EF4444" : colors.foreground }]}>{label}</Text>
      <View style={styles.rowRight}>
        {value && <Text style={[styles.rowValue, { color: colors.mutedForeground }]}>{value}</Text>}
        {toggle ? (
          <Switch
            value={toggleValue}
            onValueChange={onToggle}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor="#fff"
          />
        ) : (
          <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
        )}
      </View>
    </TouchableOpacity>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const colors = useColors();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>{title}</Text>
      <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {children}
      </View>
    </View>
  );
}

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const [notifications, setNotifications] = React.useState(true);
  const [analytics, setAnalytics] = React.useState(false);
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: topPad + 8, paddingBottom: insets.bottom + 100 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.pageTitle, { color: colors.foreground }]}>Settings</Text>

      <View style={[styles.profile, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.avatar, { backgroundColor: colors.primary + "25" }]}>
          <Text style={[styles.avatarText, { color: colors.primary }]}>GC</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={[styles.profileName, { color: colors.foreground }]}>GoClaw User</Text>
          <Text style={[styles.profileEmail, { color: colors.mutedForeground }]}>user@goclaw.ai</Text>
        </View>
        <TouchableOpacity style={[styles.editBtn, { borderColor: colors.border }]}>
          <Ionicons name="pencil-outline" size={16} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      <Section title="PREFERENCES">
        <Row icon="notifications-outline" label="Notifications" toggle toggleValue={notifications} onToggle={setNotifications} />
        <Row icon="moon-outline" label="Appearance" value={colorScheme === "dark" ? "Dark" : "Light"} />
        <Row icon="language-outline" label="Language" value="English" />
      </Section>

      <Section title="AI SETTINGS">
        <Row icon="hardware-chip-outline" label="Default Agent" value="Assistant" iconColor="#3B82F6" />
        <Row icon="key-outline" label="API Keys" iconColor="#8B5CF6" />
        <Row icon="speedometer-outline" label="Response Mode" value="Balanced" iconColor="#22C55E" />
      </Section>

      <Section title="PRIVACY">
        <Row icon="analytics-outline" label="Usage Analytics" toggle toggleValue={analytics} onToggle={setAnalytics} iconColor="#F59E0B" />
        <Row icon="shield-checkmark-outline" label="Privacy Policy" iconColor="#6B7280" />
      </Section>

      <Section title="ABOUT">
        <Row icon="information-circle-outline" label="Version" value="1.0.0" iconColor="#6B7280" />
        <Row icon="help-circle-outline" label="Help & Support" iconColor="#6B7280" />
        <Row icon="star-outline" label="Rate GoClaw" iconColor="#F59E0B" />
      </Section>

      <Section title="ACCOUNT">
        <Row icon="log-out-outline" label="Sign Out" danger />
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16 },
  pageTitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
    paddingHorizontal: 4,
    marginBottom: 20,
  },
  profile: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 24,
    gap: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  profileInfo: { flex: 1 },
  profileName: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  profileEmail: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  editBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sectionCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  rowValue: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
});
