import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Methods } from "@/lib/api/protocol";

export interface PairedDevice {
  sender_id: string;
  channel: string;
  chat_id?: string;
  paired_at?: string;
  user_id?: string;
  name?: string;
}

export interface PairingSession {
  code: string;
  expires_at: string;
  qr_url?: string;
}

export function useDevices() {
  const { ws, connected } = useAuth();
  const [devices, setDevices] = useState<PairedDevice[]>([]);
  const [pairing, setPairing] = useState<PairingSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  const load = useCallback(async () => {
    if (!ws?.isConnected) return;
    setLoading(true);
    setError(null);
    try {
      const res = await ws.call<{ devices: PairedDevice[] }>(Methods.DEVICE_PAIR_LIST, {});
      setDevices(res.devices ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load devices");
    } finally {
      setLoading(false);
    }
  }, [ws]);

  useEffect(() => {
    if (connected && !fetchedRef.current) {
      fetchedRef.current = true;
      load();
    }
  }, [connected, load]);

  useEffect(() => {
    if (!connected) fetchedRef.current = false;
  }, [connected]);

  const initiratePairing = useCallback(async () => {
    if (!ws?.isConnected) return;
    try {
      const res = await ws.call<PairingSession>(Methods.DEVICE_PAIR_INITIATE, {});
      setPairing(res);
      return res;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to initiate pairing");
    }
  }, [ws]);

  const unpair = useCallback(
    async (senderID: string) => {
      if (!ws?.isConnected) return;
      await ws.call(Methods.DEVICE_PAIR_UNPAIR, { sender_id: senderID });
      setDevices((prev) => prev.filter((d) => d.sender_id !== senderID));
    },
    [ws],
  );

  const cancelPairing = useCallback(async () => {
    if (!ws?.isConnected) return;
    await ws.call(Methods.DEVICE_PAIR_CANCEL, {}).catch(() => {});
    setPairing(null);
  }, [ws]);

  return { devices, pairing, loading, error, refresh: load, initiratePairing, unpair, cancelPairing };
}
