import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Events, Methods } from "@/lib/api/protocol";

export type QRStatus = "idle" | "starting" | "pending" | "connected" | "error";
export type QRChannelType = "whatsapp" | "zalo";

export interface ChannelQRState {
  status: QRStatus;
  qrBase64?: string;
  error?: string;
}

export function useChannelQR(channelType: QRChannelType, instanceId: string | undefined) {
  const { ws, connected } = useAuth();
  const [state, setState] = useState<ChannelQRState>({ status: "idle" });
  const unsubsRef = useRef<(() => void)[]>([]);

  const clearSubs = useCallback(() => {
    unsubsRef.current.forEach((u) => u());
    unsubsRef.current = [];
  }, []);

  useEffect(() => {
    return () => clearSubs();
  }, [clearSubs]);

  const startQR = useCallback(async (forceReauth = false) => {
    if (!ws || !connected || !instanceId) return;
    setState({ status: "starting" });
    clearSubs();

    const qrCodeEvent = channelType === "whatsapp"
      ? Events.WHATSAPP_QR_CODE
      : Events.ZALO_PERSONAL_QR_CODE;
    const qrDoneEvent = channelType === "whatsapp"
      ? Events.WHATSAPP_QR_DONE
      : Events.ZALO_PERSONAL_QR_DONE;

    const unsubCode = ws.on(qrCodeEvent, (payload: unknown) => {
      const p = payload as { png_b64?: string; instance_id?: string };
      if (p.instance_id && p.instance_id !== instanceId) return;
      setState({ status: "pending", qrBase64: p.png_b64 });
    });

    const unsubDone = ws.on(qrDoneEvent, (payload: unknown) => {
      const p = payload as { success?: boolean; error?: string; instance_id?: string };
      if (p.instance_id && p.instance_id !== instanceId) return;
      if (p.success) {
        setState({ status: "connected" });
      } else {
        setState({ status: "error", error: p.error ?? "Lỗi kết nối" });
      }
      clearSubs();
    });

    unsubsRef.current = [unsubCode, unsubDone];

    try {
      const method = channelType === "whatsapp"
        ? Methods.WHATSAPP_QR_START
        : Methods.ZALO_PERSONAL_QR_START;
      const params: Record<string, unknown> = { instance_id: instanceId };
      if (channelType === "whatsapp") params.force_reauth = forceReauth;
      await ws.call(method, params);
    } catch (e) {
      setState({ status: "error", error: e instanceof Error ? e.message : "Lỗi khởi động QR" });
      clearSubs();
    }
  }, [ws, connected, instanceId, channelType, clearSubs]);

  const reset = useCallback(() => {
    clearSubs();
    setState({ status: "idle" });
  }, [clearSubs]);

  return { state, startQR, reset };
}
