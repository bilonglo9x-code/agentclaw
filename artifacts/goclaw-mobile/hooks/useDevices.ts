import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Methods, Events } from "@/lib/api/protocol";

export interface PairedDevice {
  sender_id: string;
  channel: string;
  chat_id?: string;
  paired_at?: string;
  paired_by?: string;
  user_id?: string;
  name?: string;
}

export interface PendingPairing {
  code: string;
  sender_id: string;
  channel: string;
  chat_id?: string;
  account_id?: string;
  created_at?: string;
  expires_at?: string;
}

export interface PairingSession {
  code: string;
  expires_at: string;
  qr_url?: string;
}

export function useDevices() {
  const { ws, connected } = useAuth();
  const [devices, setDevices] = useState<PairedDevice[]>([]);
  const [pending, setPending] = useState<PendingPairing[]>([]);
  const [pairing, setPairing] = useState<PairingSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  const load = useCallback(async () => {
    if (!ws?.isConnected) return;
    setLoading(true);
    setError(null);
    try {
      const res = await ws.call<{ devices?: PairedDevice[]; paired?: PairedDevice[]; pending?: PendingPairing[] }>(Methods.DEVICE_PAIR_LIST, {});
      setDevices(res.paired ?? res.devices ?? []);
      setPending(res.pending ?? []);
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

  const approvePairing = useCallback(async (code: string) => {
    if (!ws?.isConnected) return;
    await ws.call(Methods.DEVICE_PAIR_APPROVE, { code });
    await load();
  }, [ws, load]);

  const denyPairing = useCallback(async (code: string) => {
    if (!ws?.isConnected) return;
    await ws.call(Methods.DEVICE_PAIR_DENY, { code });
    await load();
  }, [ws, load]);

  const revokePairing = useCallback(async (senderId: string, channel: string) => {
    if (!ws?.isConnected) return;
    await ws.call(Methods.DEVICE_PAIR_REVOKE, { sender_id: senderId, channel });
    await load();
  }, [ws, load]);

  useEffect(() => {
    if (!ws) return;
    const unsubReq = ws.on(Events.DEVICE_PAIR_REQUESTED, () => load());
    const unsubRes = ws.on(Events.DEVICE_PAIR_RESOLVED, () => load());
    return () => { unsubReq?.(); unsubRes?.(); };
  }, [ws, load]);

  return { devices, pending, pairing, loading, error, refresh: load, initiratePairing, unpair, cancelPairing, approvePairing, denyPairing, revokePairing };
}
