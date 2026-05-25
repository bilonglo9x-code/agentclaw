import { useEffect } from "react";
import { Platform } from "react-native";
import { useBranding } from "./useBranding";

/**
 * Loads branding config from server and applies DOM-level effects on web:
 * - document.title
 * - favicon <link rel="icon">
 * - CSS custom property --primary (accent colour as HSL values)
 */
function hexToHslValues(hex: string): string | null {
  const m = hex.match(/^#([0-9a-fA-F]{6})$/i);
  if (!m || !m[1]) return null;
  const raw = m[1];
  const r = parseInt(raw.slice(0, 2), 16) / 255;
  const g = parseInt(raw.slice(2, 4), 16) / 255;
  const b = parseInt(raw.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return `0 0% ${Math.round(l * 100)}%`;
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export function useBrandingApplier() {
  const { branding } = useBranding();

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const name = branding.name?.trim();
    if (name) document.title = name;
  }, [branding.name]);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const url = branding.faviconUrl?.trim();
    if (!url) return;
    let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = url;
  }, [branding.faviconUrl]);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const color = branding.accentColor?.trim();
    const root = document.documentElement;
    if (color && /^#[0-9a-fA-F]{6}$/i.test(color)) {
      const hsl = hexToHslValues(color);
      if (hsl) root.style.setProperty("--primary", hsl);
    } else {
      root.style.removeProperty("--primary");
    }
  }, [branding.accentColor]);

  return branding;
}
