import { useEffect, useState, useCallback } from "react";
import { useHttp } from "./use-ws";
import { useAuthStore } from "@/stores/use-auth-store";

export interface BrandingConfig {
  name: string;
  description: string;
  logoUrl: string;
  faviconUrl: string;
  accentColor: string;
  supportEmail: string;
}

export const BRANDING_DEFAULT: BrandingConfig = {
  name: "GoClaw",
  description: "AI Agent Platform",
  logoUrl: "",
  faviconUrl: "",
  accentColor: "",
  supportEmail: "",
};

export function parseBrandingFromConfigs(configs: Record<string, string>): BrandingConfig {
  return {
    name: configs["app.name"] || "",
    description: configs["app.description"] || "",
    logoUrl: configs["app.logo_url"] || "",
    faviconUrl: configs["app.favicon_url"] || "",
    accentColor: configs["app.accent_color"] || "",
    supportEmail: configs["app.support_email"] || "",
  };
}

export function useBranding() {
  const http = useHttp();
  const connected = useAuthStore((s) => s.connected);
  const [branding, setBranding] = useState<BrandingConfig>(BRANDING_DEFAULT);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!connected) return;
    setLoading(true);
    try {
      const configs = await http.get<Record<string, string>>("/v1/system-configs");
      setBranding(parseBrandingFromConfigs(configs));
    } catch {
    } finally {
      setLoading(false);
    }
  }, [connected, http]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { branding, loading, reload };
}
