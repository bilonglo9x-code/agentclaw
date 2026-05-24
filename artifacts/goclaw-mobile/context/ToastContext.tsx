import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import { Animated, Platform, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type ToastType = "success" | "error" | "info" | "warning";

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

const TOAST_COLORS: Record<ToastType, { bg: string; icon: string; iconName: keyof typeof Ionicons["glyphMap"] }> = {
  success: { bg: "#22c55e", icon: "#fff", iconName: "checkmark-circle" },
  error: { bg: "#ef4444", icon: "#fff", iconName: "alert-circle" },
  warning: { bg: "#f59e0b", icon: "#fff", iconName: "warning" },
  info: { bg: "#3b82f6", icon: "#fff", iconName: "information-circle" },
};

function ToastItem({ message, type, onDone }: { message: string; type: ToastType; onDone: () => void }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-16)).current;
  const insets = useSafeAreaInsets();
  const cfg = TOAST_COLORS[type];

  React.useEffect(() => {
    Animated.parallel([
      Animated.spring(opacity, { toValue: 1, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true }),
    ]).start();
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -16, duration: 200, useNativeDriver: true }),
      ]).start(() => onDone());
    }, 2400);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View
      style={[
        toastStyles.toast,
        { backgroundColor: cfg.bg, marginTop: insets.top + 8, opacity, transform: [{ translateY }] },
      ]}
    >
      <Ionicons name={cfg.iconName} size={16} color={cfg.icon} />
      <Text style={toastStyles.text} numberOfLines={2}>{message}</Text>
    </Animated.View>
  );
}

const toastStyles = StyleSheet.create({
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    marginHorizontal: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  text: { color: "#fff", fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 },
});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev.slice(-2), { id, message, type }]);
  }, []);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 9999,
          pointerEvents: "none" as any,
        }}
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} message={t.message} type={t.type} onDone={() => remove(t.id)} />
        ))}
      </View>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
