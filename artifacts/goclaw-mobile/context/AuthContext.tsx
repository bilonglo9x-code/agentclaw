import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { WsClient, ConnectionState } from "@/lib/api/ws-client";
import { HttpClient } from "@/lib/api/http-client";

const STORAGE_KEY = "goclaw:auth";

interface AuthState {
  serverUrl: string;
  token: string;
  userId: string;
  senderID: string;
}

interface AuthContextValue {
  serverUrl: string;
  token: string;
  userId: string;
  connected: boolean;
  connectionState: ConnectionState;
  role: string;
  tenantName: string;
  isOwner: boolean;
  isMasterScope: boolean;
  ws: WsClient | null;
  http: HttpClient | null;
  login: (serverUrl: string, token: string) => Promise<void>;
  logout: () => Promise<void>;
  isReady: boolean;
  authError: string | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [serverUrl, setServerUrl] = useState("");
  const [token, setToken] = useState("");
  const [userId, setUserId] = useState("");
  const [connectionState, setConnectionState] = useState<ConnectionState>("disconnected");
  const [role, setRole] = useState("");
  const [tenantName, setTenantName] = useState("");
  const [isOwner, setIsOwner] = useState(false);
  const [isMasterScope, setIsMasterScope] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const wsRef = useRef<WsClient | null>(null);
  const httpRef = useRef<HttpClient | null>(null);

  const buildClients = useCallback((url: string, tok: string, uid: string, sid: string) => {
    if (wsRef.current) {
      wsRef.current.disconnect();
    }

    const base = url.endsWith("/") ? url.slice(0, -1) : url;
    const wsUrl = base.replace(/^http/, "ws") + "/v1/ws";
    const httpBase = base;

    const http = new HttpClient(httpBase, () => tok, () => uid);
    httpRef.current = http;

    const ws = new WsClient(
      wsUrl,
      () => tok,
      () => uid,
      () => sid,
      (state) => {
        setConnectionState(state);
        if (state === "connected") {
          setRole(ws.role);
          setTenantName(ws.tenantName);
          setIsOwner(ws.isOwner);
          setIsMasterScope(ws.isMasterScope);
        }
      },
    );
    ws.onAuthFailure = async () => {
      setAuthError("Token không hợp lệ hoặc bị từ chối bởi máy chủ");
      await logout();
    };
    wsRef.current = ws;
    ws.connect();
  }, []);

  const logout = useCallback(async () => {
    wsRef.current?.disconnect();
    wsRef.current = null;
    httpRef.current = null;
    await AsyncStorage.removeItem(STORAGE_KEY);
    setServerUrl("");
    setToken("");
    setUserId("");
    setConnectionState("disconnected");
    setRole("");
    setTenantName("");
    setIsOwner(false);
    setIsMasterScope(false);
  }, []);

  const login = useCallback(async (url: string, tok: string) => {
    setAuthError(null);
    const base = url.endsWith("/") ? url.slice(0, -1) : url;
    // Pre-validate: check server reachable and token accepted via HTTP
    const testHttp = new HttpClient(base, () => tok, () => "");
    try {
      await testHttp.get("/health");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("UNAUTHORIZED") || msg.includes("401") || msg.includes("403")) {
        throw new Error("Token không hợp lệ");
      }
      // Server reachable but /health returned non-auth error → still proceed
      if (msg.includes("Failed to fetch") || msg.includes("NetworkError") || msg.includes("ECONNREFUSED")) {
        throw new Error(`Không kết nối được máy chủ: ${base}`);
      }
    }
    const uid = "";
    const sid = `mobile-${Date.now()}`;
    const auth: AuthState = { serverUrl: url, token: tok, userId: uid, senderID: sid };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
    setServerUrl(url);
    setToken(tok);
    setUserId(uid);
    buildClients(url, tok, uid, sid);
  }, [buildClients]);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const auth: AuthState = JSON.parse(raw);
          if (auth.token && auth.serverUrl) {
            setServerUrl(auth.serverUrl);
            setToken(auth.token);
            setUserId(auth.userId ?? "");
            buildClients(auth.serverUrl, auth.token, auth.userId ?? "", auth.senderID ?? `mobile-${Date.now()}`);
          }
        }
      } catch {}
      setIsReady(true);
    })();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        serverUrl,
        token,
        userId,
        connected: connectionState === "connected",
        connectionState,
        role,
        tenantName,
        isOwner,
        isMasterScope,
        ws: wsRef.current,
        http: httpRef.current,
        login,
        logout,
        isReady,
        authError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
