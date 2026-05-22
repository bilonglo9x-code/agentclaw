import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";

export interface ChannelContact {
  id: string;
  channel_type: string;
  channel_instance?: string;
  sender_id: string;
  user_id?: string;
  display_name?: string;
  username?: string;
  avatar_url?: string;
  peer_kind?: string;
  contact_type: string;
  thread_id?: string;
  merged_id?: string;
  first_seen_at: string;
  last_seen_at: string;
}

export function useContacts(search?: string, channelType?: string) {
  const { http, connected } = useAuth();
  const [contacts, setContacts] = useState<ChannelContact[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  const load = useCallback(async () => {
    if (!http || !connected) return;
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = { limit: "50" };
      if (search) params.search = search;
      if (channelType) params.channel_type = channelType;
      const res = await http.get<{ contacts: ChannelContact[]; total: number }>("/v1/contacts", params);
      setContacts(res.contacts ?? []);
      setTotal(res.total ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load contacts");
    } finally {
      setLoading(false);
    }
  }, [http, connected, search, channelType]);

  useEffect(() => {
    if (connected && !fetchedRef.current) {
      fetchedRef.current = true;
      load();
    }
  }, [connected, load]);

  useEffect(() => {
    if (!connected) fetchedRef.current = false;
  }, [connected]);

  return { contacts, total, loading, error, refresh: load };
}
