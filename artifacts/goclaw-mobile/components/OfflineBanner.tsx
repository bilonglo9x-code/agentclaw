import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";

export function OfflineBanner() {
  const { connected } = useAuth();
  const translateY = useRef(new Animated.Value(-48)).current;
  const wasConnected = useRef(connected);

  useEffect(() => {
    if (!connected && wasConnected.current) {
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
    } else if (connected && !wasConnected.current) {
      Animated.timing(translateY, { toValue: -48, duration: 300, useNativeDriver: true }).start();
    }
    wasConnected.current = connected;
  }, [connected]);

  if (connected) return null;

  return (
    <Animated.View style={[styles.banner, { transform: [{ translateY }] }]}>
      <Ionicons name="cloud-offline-outline" size={14} color="#fff" />
      <Text style={styles.text}>Mất kết nối server · Đang thử kết nối lại...</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "#ef4444",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    zIndex: 1000,
  },
  text: { color: "#fff", fontSize: 12, fontFamily: "Inter_500Medium" },
});
