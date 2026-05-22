import { useCallback, useState } from "react";
import { useAuth } from "@/context/AuthContext";

export interface BackupPreflight {
  db_size_human: string;
  data_dir_size_human: string;
  workspace_size_human: string;
  free_disk_human: string;
  has_enough_space: boolean;
}

export type BackupPhase = "idle" | "running" | "done" | "error";

export function useBackup() {
  const { http } = useAuth();
  const [preflight, setPreflight] = useState<BackupPreflight | null>(null);
  const [phase, setPhase] = useState<BackupPhase>("idle");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [progressMsg, setProgressMsg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const loadPreflight = useCallback(async () => {
    if (!http) return;
    try {
      const res = await http.get<BackupPreflight>("/v1/system/backup/preflight");
      setPreflight(res);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Preflight failed");
    }
  }, [http]);

  const runBackup = useCallback(async () => {
    if (!http) return;
    setPhase("running");
    setError(null);
    setDownloadUrl(null);
    setProgressMsg("Đang tạo backup...");
    try {
      const res = await http.post<{ download_url?: string; token?: string }>(
        "/v1/system/backup",
        {},
      );
      const url = res.download_url ?? (res.token ? `/v1/system/backup/download/${res.token}` : null);
      setDownloadUrl(url);
      setPhase("done");
      setProgressMsg("Backup hoàn thành");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Backup failed");
      setPhase("error");
      setProgressMsg("");
    }
  }, [http]);

  const runRestore = useCallback(async (file: { uri: string; name: string; type: string }): Promise<boolean> => {
    if (!http) return false;
    setPhase("running");
    setError(null);
    setProgressMsg("Đang restore...");
    try {
      const formData = new FormData();
      formData.append("file", { uri: file.uri, name: file.name, type: file.type } as unknown as Blob);
      await http.post("/v1/system/restore", formData);
      setPhase("done");
      setProgressMsg("Restore hoàn thành — khởi động lại hệ thống");
      return true;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Restore failed");
      setPhase("error");
      setProgressMsg("");
      return false;
    }
  }, [http]);

  return { preflight, phase, downloadUrl, progressMsg, error, loadPreflight, runBackup, runRestore };
}
