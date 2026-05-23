import { useCallback, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";

export interface MediaFile {
  id: string;
  path: string;
  filename: string;
  mime_type: string;
  size?: number;
  created_at?: string;
  url?: string;
}

export interface UploadResult {
  path: string;
  mime_type: string;
  filename: string;
  id?: string;
}

export function useMedia() {
  const { http, connected, serverUrl } = useAuth();
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  const load = useCallback(async () => {
    if (!http || !connected) return;
    setLoading(true);
    setError(null);
    try {
      const res = await http.get<{ files: MediaFile[] }>("/v1/media");
      setFiles((res.files ?? []).map((f) => ({
        ...f,
        url: `${serverUrl}/v1/media/${f.id ?? f.path}`,
      })));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi tải media");
    } finally {
      setLoading(false);
    }
  }, [http, connected, serverUrl]);

  const refresh = useCallback(() => {
    fetchedRef.current = false;
    load();
  }, [load]);

  const getMediaUrl = useCallback((id: string) => {
    return `${serverUrl}/v1/media/${id}`;
  }, [serverUrl]);

  const upload = useCallback(async (
    uri: string,
    filename: string,
    mimeType: string,
  ): Promise<UploadResult> => {
    if (!http) throw new Error("Not connected");
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", { uri, name: filename, type: mimeType } as unknown as Blob);
      const res = await http.postForm<UploadResult>("/v1/media/upload", formData);
      return res;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Lỗi upload";
      setError(msg);
      throw e;
    } finally {
      setUploading(false);
    }
  }, [http]);

  return { files, loading, uploading, error, load, refresh, upload, getMediaUrl };
}
