import { PROTOCOL_VERSION } from "./protocol";
import { ApiError } from "./http-client";

type EventListener = (payload: unknown) => void;

interface PendingRequest {
  resolve: (payload: unknown) => void;
  reject: (error: ApiError) => void;
  timeout: ReturnType<typeof setTimeout>;
}

export type ConnectionState = "disconnected" | "connecting" | "connected";

let _idCounter = 0;
function generateId(): string {
  return `rn-${Date.now()}-${++_idCounter}`;
}

export class WsClient {
  private ws: WebSocket | null = null;
  private pending = new Map<string, PendingRequest>();
  private eventListeners = new Map<string, Set<EventListener>>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private authenticated = false;
  private intentionalClose = false;
  private connectGeneration = 0;

  role: "owner" | "admin" | "operator" | "viewer" | "" = "";
  tenantId = "";
  tenantName = "";
  tenantSlug = "";
  isOwner = false;
  isMasterScope = false;
  edition: "standard" | "lite" = "standard";
  serverVersion = "";

  private readonly maxReconnectDelay = 30_000;
  private readonly baseReconnectDelay = 2_000;
  private readonly defaultTimeout = 30_000;

  onAuthFailure: (() => void) | null = null;

  constructor(
    private wsUrl: string,
    private getToken: () => string,
    private getUserId: () => string,
    private getSenderID: () => string,
    private onStateChange: (state: ConnectionState) => void,
  ) {}

  connect(): void {
    if (this.ws) return;
    this.intentionalClose = false;
    this.onStateChange("connecting");

    const socket = new WebSocket(this.wsUrl);
    const generation = ++this.connectGeneration;
    this.ws = socket;

    socket.onopen = () => {
      if (this.ws !== socket) return;
      this.reconnectAttempts = 0;
      this.authenticate(generation);
    };

    socket.onmessage = (event) => {
      this.handleMessage(event.data as string);
    };

    socket.onclose = () => {
      if (this.ws !== socket) return;
      this.ws = null;
      this.authenticated = false;
      this.onStateChange("disconnected");
      this.rejectAllPending("Connection closed");
      if (!this.intentionalClose) this.scheduleReconnect();
    };

    socket.onerror = () => {};
  }

  disconnect(): void {
    this.intentionalClose = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      const socket = this.ws;
      this.ws = null;
      socket.close();
    }
    this.authenticated = false;
    this.rejectAllPending("Disconnected");
    this.onStateChange("disconnected");
  }

  get isConnected(): boolean {
    return this.authenticated && this.ws?.readyState === WebSocket.OPEN;
  }

  async call<T = unknown>(
    method: string,
    params?: Record<string, unknown>,
    timeoutMs?: number,
  ): Promise<T> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new ApiError("UNAVAILABLE", "WebSocket not connected");
    }

    const id = generateId();
    const timeout = timeoutMs ?? this.defaultTimeout;

    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new ApiError("TIMEOUT", `${method} timed out after ${timeout}ms`));
      }, timeout);

      this.pending.set(id, {
        resolve: resolve as (p: unknown) => void,
        reject,
        timeout: timer,
      });

      this.ws!.send(JSON.stringify({ type: "req", id, method, params }));
    });
  }

  on(event: string, listener: EventListener): () => void {
    let listeners = this.eventListeners.get(event);
    if (!listeners) {
      listeners = new Set();
      this.eventListeners.set(event, listeners);
    }
    listeners.add(listener);
    return () => {
      listeners!.delete(listener);
      if (listeners!.size === 0) this.eventListeners.delete(event);
    };
  }

  private scheduleReconnect(): void {
    const delay = Math.min(
      this.baseReconnectDelay * Math.pow(1.5, this.reconnectAttempts),
      this.maxReconnectDelay,
    );
    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  private async authenticate(generation: number): Promise<void> {
    try {
      // Use stable mobile user ID so server-side userID != ""
      const effectiveUserId = this.getUserId() || "mobile-gateway";
      const res = await this.call<{
        role?: string;
        status?: string;
        tenant_id?: string;
        tenant_name?: string;
        tenant_slug?: string;
        is_owner?: boolean;
        is_master_scope?: boolean;
        edition?: "standard" | "lite";
        server?: { name?: string; version?: string };
      }>("connect", {
        token: this.getToken(),
        user_id: effectiveUserId,
        sender_id: this.getSenderID(),
        locale: "vi",
        tenant_hint: "",
        tenant_id: "",
        protocolVersion: PROTOCOL_VERSION,
      });

      if (this.connectGeneration !== generation) return;

      if (this.getToken() && res?.role === "viewer") {
        this.intentionalClose = true;
        this.ws?.close();
        this.onAuthFailure?.();
        return;
      }

      this.authenticated = true;
      this.role = (res?.role as "owner" | "admin" | "operator" | "viewer") ?? "";
      this.tenantId = res?.tenant_id ?? "";
      this.tenantName = res?.tenant_name ?? "";
      this.tenantSlug = res?.tenant_slug ?? "";
      this.isOwner = res?.is_owner ?? false;
      this.isMasterScope = res?.is_master_scope ?? false;
      this.edition = res?.edition ?? "standard";
      this.serverVersion = res?.server?.version ?? "";
      this.onStateChange("connected");
    } catch {
      if (this.connectGeneration === generation) {
        this.intentionalClose = true;
        this.ws?.close();
        this.onAuthFailure?.();
      }
    }
  }

  private handleMessage(data: string): void {
    let frame: { type: string };
    try {
      frame = JSON.parse(data);
    } catch {
      return;
    }

    if (frame.type === "res") {
      const res = frame as { type: string; id: string; ok: boolean; payload?: unknown; error?: { code: string; message: string } };
      const pending = this.pending.get(res.id);
      if (!pending) return;
      this.pending.delete(res.id);
      clearTimeout(pending.timeout);
      if (res.ok) {
        pending.resolve(res.payload);
      } else {
        pending.reject(new ApiError(res.error?.code ?? "RPC_ERROR", res.error?.message ?? "RPC error"));
      }
    } else if (frame.type === "event") {
      const evt = frame as { type: string; event: string; payload?: unknown };
      const listeners = this.eventListeners.get(evt.event);
      if (listeners) {
        listeners.forEach((fn) => fn(evt.payload));
      }
    }
  }

  private rejectAllPending(reason: string): void {
    for (const [, pending] of this.pending) {
      clearTimeout(pending.timeout);
      pending.reject(new ApiError("DISCONNECTED", reason));
    }
    this.pending.clear();
  }
}
