import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";

export interface StorageFile {
  path: string;
  name: string;
  isDir: boolean;
  size: number;
  hasChildren?: boolean;
  protected: boolean;
}

export function useStorage() {
  const { http, connected } = useAuth();
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [baseDir, setBaseDir] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  const listFiles = useCallback(
    async (path?: string) => {
      if (!http || !connected) return;
      setLoading(true);
      setError(null);
      try {
        const params: Record<string, string> = {};
        if (path) params.path = path;
        const res = await http.get<{ files: StorageFile[]; baseDir: string }>("/v1/storage/files", params);
        setFiles(res.files ?? []);
        setBaseDir(res.baseDir ?? "");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load storage");
      } finally {
        setLoading(false);
      }
    },
    [http, connected],
  );

  const loadSubtree = useCallback(
    async (path: string): Promise<StorageFile[]> => {
      if (!http) return [];
      const res = await http.get<{ files: StorageFile[] }>("/v1/storage/files", { path });
      return res.files ?? [];
    },
    [http],
  );

  const deleteFile = useCallback(
    async (path: string) => {
      if (!http) return;
      await http.delete(`/v1/storage/files/${encodeURIComponent(path)}`);
      setFiles((prev) => prev.filter((f) => f.path !== path));
    },
    [http],
  );

  useEffect(() => {
    if (connected && !fetchedRef.current) {
      fetchedRef.current = true;
      listFiles();
    }
  }, [connected, listFiles]);

  useEffect(() => {
    if (!connected) fetchedRef.current = false;
  }, [connected]);

  return { files, baseDir, loading, error, refresh: listFiles, loadSubtree, deleteFile };
}
