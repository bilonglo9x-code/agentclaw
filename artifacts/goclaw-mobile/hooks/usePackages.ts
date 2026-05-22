import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";

export interface PackageInfo {
  name: string;
  version: string;
}

export interface GitHubPackageInfo {
  name: string;
  repo: string;
  tag: string;
  binaries: string[];
  installed_at: string;
}

export interface InstalledPackages {
  system: PackageInfo[] | null;
  pip: PackageInfo[] | null;
  npm: PackageInfo[] | null;
  github?: GitHubPackageInfo[] | null;
}

export function usePackages() {
  const { http, connected } = useAuth();
  const [packages, setPackages] = useState<InstalledPackages>({ system: null, pip: null, npm: null });
  const [loading, setLoading] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  const load = useCallback(async () => {
    if (!http || !connected) return;
    setLoading(true);
    setError(null);
    try {
      const res = await http.get<InstalledPackages>("/v1/packages");
      setPackages(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load packages");
    } finally {
      setLoading(false);
    }
  }, [http, connected]);

  useEffect(() => {
    if (connected && !fetchedRef.current) {
      fetchedRef.current = true;
      load();
    }
  }, [connected, load]);

  useEffect(() => {
    if (!connected) fetchedRef.current = false;
  }, [connected]);

  const installPackage = useCallback(
    async (pkg: string): Promise<{ ok: boolean; error?: string }> => {
      if (!http) return { ok: false, error: "Not connected" };
      setInstalling(true);
      try {
        const res = await http.post<{ ok: boolean; error: string }>("/v1/packages/install", { package: pkg });
        if (res.ok) await load();
        return res;
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : "Install failed" };
      } finally {
        setInstalling(false);
      }
    },
    [http, load],
  );

  return { packages, loading, installing, error, refresh: load, installPackage };
}
