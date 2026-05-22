import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";

export interface Voice {
  id: string;
  name: string;
  provider: string;
  language?: string;
  gender?: string;
  preview_url?: string;
  tags?: string[];
}

export function useVoices() {
  const { http, connected } = useAuth();
  const [voices, setVoices] = useState<Voice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!http) return;
    setLoading(true);
    setError(null);
    try {
      const res = await http.get<{ voices: Voice[] }>("/v1/voices");
      setVoices(res.voices ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load voices");
    } finally {
      setLoading(false);
    }
  }, [http]);

  const refresh = useCallback(async () => {
    if (!http) return;
    try {
      await http.post("/v1/voices/refresh", {});
      await fetch();
    } catch {
      // ignore
    }
  }, [http, fetch]);

  const synthesize = useCallback(
    async (text: string, voiceId?: string, provider?: string): Promise<string | null> => {
      if (!http) return null;
      try {
        const res = await http.post<{ audio_url?: string; url?: string }>(
          "/v1/tts/synthesize",
          { text, voice_id: voiceId, provider },
        );
        return res.audio_url ?? res.url ?? null;
      } catch {
        return null;
      }
    },
    [http],
  );

  useEffect(() => {
    if (connected) fetch();
  }, [connected, fetch]);

  return { voices, loading, error, refresh, synthesize };
}
