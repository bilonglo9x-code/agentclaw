import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";

export interface BrandingConfig {
  name: string;
  description: string;
  logoUrl: string;
  faviconUrl: string;
  accentColor: string;
  supportEmail: string;
}

const EMPTY: BrandingConfig = {
  name: "",
  description: "",
  logoUrl: "",
  faviconUrl: "",
  accentColor: "",
  supportEmail: "",
};

const KEY_MAP: Record<keyof BrandingConfig, string> = {
  name: "app.name",
  description: "app.description",
  logoUrl: "app.logo_url",
  faviconUrl: "app.favicon_url",
  accentColor: "app.accent_color",
  supportEmail: "app.support_email",
};

export function useBranding() {
  const { http, connected } = useAuth();
  const [branding, setBranding] = useState<BrandingConfig>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!http || !connected) return;
    setLoading(true);
    setError(null);
    try {
      const configs = await http.get<Record<string, string>>("/v1/system-configs");
      setBranding({
        name: configs["app.name"] ?? "",
        description: configs["app.description"] ?? "",
        logoUrl: configs["app.logo_url"] ?? "",
        faviconUrl: configs["app.favicon_url"] ?? "",
        accentColor: configs["app.accent_color"] ?? "",
        supportEmail: configs["app.support_email"] ?? "",
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi tải cấu hình");
    } finally {
      setLoading(false);
    }
  }, [http, connected]);

  const save = useCallback(async (updates: Partial<BrandingConfig>) => {
    if (!http) throw new Error("Chưa kết nối");
    setSaving(true);
    setError(null);
    try {
      const entries = Object.entries(updates) as [keyof BrandingConfig, string][];
      await Promise.all(
        entries.map(([field, value]) =>
          http.put(`/v1/system-configs/${KEY_MAP[field]}`, { value: value ?? "" }),
        ),
      );
      setBranding((prev) => ({ ...prev, ...updates }));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Lỗi lưu cấu hình";
      setError(msg);
      throw e;
    } finally {
      setSaving(false);
    }
  }, [http]);

  useEffect(() => {
    if (connected) load();
  }, [connected, load]);

  return { branding, loading, saving, error, load, save };
}
