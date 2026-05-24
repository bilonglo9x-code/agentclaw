import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";

const ONBOARDING_KEY = "goclaw:onboarded";

interface Step {
  id: string;
  icon: keyof typeof Ionicons["glyphMap"];
  color: string;
  title: string;
  desc: string;
  action: string;
  route?: string;
}

const STEPS: Step[] = [
  {
    id: "connect",
    icon: "cloud-outline",
    color: "#60a5fa",
    title: "Kết nối server",
    desc: "Nhập URL server GoClaw và API token của bạn để bắt đầu",
    action: "Kết nối ngay",
    route: "/login",
  },
  {
    id: "agent",
    icon: "hardware-chip-outline",
    color: "#a78bfa",
    title: "Chọn hoặc tạo agent",
    desc: "Khám phá danh sách agents có sẵn hoặc tạo agent AI của riêng bạn",
    action: "Xem Agents",
    route: "/(tabs)/agents",
  },
  {
    id: "chat",
    icon: "chatbubbles-outline",
    color: "#f97316",
    title: "Gửi tin nhắn đầu tiên",
    desc: "Bắt đầu cuộc trò chuyện với agent AI và trải nghiệm sức mạnh của GoClaw",
    action: "Bắt đầu Chat",
    route: "/(tabs)/index",
  },
];

export async function markOnboarded() {
  await AsyncStorage.setItem(ONBOARDING_KEY, "1");
}

export async function isOnboarded(): Promise<boolean> {
  const val = await AsyncStorage.getItem(ONBOARDING_KEY);
  return val === "1";
}

export default function OnboardingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { connected } = useAuth();
  const topPad = insets.top;

  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    if (connected) {
      setCompletedSteps((prev) => new Set([...prev, "connect"]));
    }
  }, [connected]);

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  const allDone = STEPS.every((s) => completedSteps.has(s.id));

  const handleStepAction = async (step: Step) => {
    if (step.route) {
      router.push(step.route as Parameters<typeof router.push>[0]);
    }
  };

  const handleSkip = async () => {
    await markOnboarded();
    router.replace("/(tabs)");
  };

  const handleFinish = async () => {
    await markOnboarded();
    router.replace("/(tabs)");
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topPad }]}>
      <Animated.View style={[styles.inner, { opacity: fadeAnim }]}>
        {/* Logo / Brand */}
        <View style={styles.brandArea}>
          <Animated.View style={[styles.logoWrap, { backgroundColor: colors.primary + "18", transform: [{ scale: pulseAnim }] }]}>
            <Ionicons name="paw-outline" size={40} color={colors.primary} />
          </Animated.View>
          <Text style={[styles.brandName, { color: colors.foreground }]}>GoClaw</Text>
          <Text style={[styles.brandTagline, { color: colors.mutedForeground }]}>
            AI Agent Platform
          </Text>
        </View>

        {/* Steps */}
        <View style={[styles.stepsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.stepsTitle, { color: colors.foreground }]}>Bắt đầu trong 3 bước</Text>

          {STEPS.map((step, idx) => {
            const done = completedSteps.has(step.id);
            return (
              <View key={step.id} style={styles.stepRow}>
                <View style={styles.stepLeft}>
                  <View style={[
                    styles.stepIconWrap,
                    {
                      backgroundColor: done ? step.color + "20" : colors.muted,
                      borderColor: done ? step.color + "40" : colors.border,
                    },
                  ]}>
                    {done
                      ? <Ionicons name="checkmark" size={18} color={step.color} />
                      : <Ionicons name={step.icon} size={18} color={colors.mutedForeground} />
                    }
                  </View>
                  {idx < STEPS.length - 1 && (
                    <View style={[styles.stepLine, { backgroundColor: done ? step.color + "40" : colors.border }]} />
                  )}
                </View>
                <View style={styles.stepContent}>
                  <Text style={[styles.stepTitle, { color: done ? colors.mutedForeground : colors.foreground }]}>
                    {step.title}
                  </Text>
                  <Text style={[styles.stepDesc, { color: colors.mutedForeground }]} numberOfLines={2}>
                    {step.desc}
                  </Text>
                  {!done && (
                    <TouchableOpacity
                      onPress={() => handleStepAction(step)}
                      style={[styles.stepBtn, { backgroundColor: step.color + "18", borderColor: step.color + "40" }]}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.stepBtnText, { color: step.color }]}>{step.action} →</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {/* Actions */}
        {allDone ? (
          <TouchableOpacity
            onPress={handleFinish}
            style={[styles.finishBtn, { backgroundColor: colors.primary }]}
            activeOpacity={0.8}
          >
            <Ionicons name="rocket-outline" size={18} color="#fff" />
            <Text style={styles.finishBtnText}>Vào GoClaw!</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={handleSkip} activeOpacity={0.7}>
            <Text style={[styles.skipText, { color: colors.mutedForeground }]}>Bỏ qua, vào sau</Text>
          </TouchableOpacity>
        )}

        <Text style={[styles.versionText, { color: colors.mutedForeground }]}>GoClaw Mobile v1.0</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, paddingHorizontal: 24, justifyContent: "center", gap: 28 },
  brandArea: { alignItems: "center", gap: 10 },
  logoWrap: { width: 80, height: 80, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  brandName: { fontSize: 32, fontFamily: "Inter_700Bold", letterSpacing: -1 },
  brandTagline: { fontSize: 14, fontFamily: "Inter_400Regular" },
  stepsCard: { borderRadius: 24, borderWidth: 1, padding: 20, gap: 0 },
  stepsTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", marginBottom: 16 },
  stepRow: { flexDirection: "row", gap: 14, minHeight: 80 },
  stepLeft: { alignItems: "center", width: 44 },
  stepIconWrap: { width: 44, height: 44, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  stepLine: { width: 2, flex: 1, marginVertical: 4 },
  stepContent: { flex: 1, paddingBottom: 12, gap: 4 },
  stepTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", paddingTop: 10 },
  stepDesc: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  stepBtn: { alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1, marginTop: 4 },
  stepBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  finishBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 16, paddingVertical: 14 },
  finishBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
  skipText: { textAlign: "center", fontSize: 13, fontFamily: "Inter_400Regular" },
  versionText: { textAlign: "center", fontSize: 11, fontFamily: "Inter_400Regular" },
});
