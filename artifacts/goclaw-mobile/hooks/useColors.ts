import colors from "@/constants/colors";
import { useTheme } from "@/context/ThemeContext";

export function useColors() {
  const { resolvedScheme } = useTheme();
  const palette = resolvedScheme === "light" ? colors.light_real : colors.dark;
  return { ...palette, radius: colors.radius };
}
