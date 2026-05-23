import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";

export type TTSProvider = "edge" | "openai" | "elevenlabs" | "gemini" | "minimax";
export type TTSMode = "auto" | "manual";

export interface TTSProviderConfig {
  api_key?: string;
  api_base?: string;
  voice_id?: string;
  model_id?: string;
  params?: Record<string, unknown>;
}

export interface TTSConfig {
  provider: TTSProvider;
  auto?: boolean;
  mode?: TTSMode;
  max_length?: number;
  timeout_ms?: number;
  openai?: TTSProviderConfig;
  elevenlabs?: TTSProviderConfig;
  edge?: TTSProviderConfig;
  minimax?: TTSProviderConfig;
  gemini?: TTSProviderConfig;
}

export function useTTSConfig() {
  const { http, connected } = useAuth();
  const [config, setConfig] = useState<TTSConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  const load = useCallback(async () => {
    if (!http || !connected) return;
    setLoading(true);
    setError(null);
    try {
      const res = await http.get<TTSConfig>("/v1/tts/config");
      setConfig(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi tải TTS config");
    } finally {
      setLoading(false);
    }
  }, [http, connected]);

  useEffect(() => {
    if (!connected || fetchedRef.current) return;
    fetchedRef.current = true;
    load();
  }, [connected, load]);

  useEffect(() => {
    if (!connected) {
      fetchedRef.current = false;
      setConfig(null);
    }
  }, [connected]);

  const saveConfig = useCallback(async (cfg: TTSConfig) => {
    if (!http) throw new Error("Not connected");
    setSaving(true);
    setError(null);
    try {
      const res = await http.post<TTSConfig>("/v1/tts/config", cfg);
      setConfig(res ?? cfg);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Lỗi lưu config";
      setError(msg);
      throw e;
    } finally {
      setSaving(false);
    }
  }, [http]);

  return { config, loading, saving, error, load, saveConfig };
}
