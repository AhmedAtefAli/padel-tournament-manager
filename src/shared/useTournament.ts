import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabase';
import { defaultTournament, type Tournament } from './tournament';

export function useTournament() {
  const [tournament, setTournament] = useState<Tournament>(defaultTournament);
  const reload = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase.from('tournament_state').select('data').eq('id', 1).maybeSingle();
    if (data?.data) setTournament(data.data as Tournament);
  }, []);
  useEffect(() => {
    void reload();
    const client = supabase;
    if (!client) return;
    const channel = client.channel('scores').on('postgres_changes', { event: '*', schema: 'public', table: 'tournament_state' }, reload).subscribe();
    return () => { void client.removeChannel(channel); };
  }, [reload]);
  return { tournament, setTournament, reload };
}

