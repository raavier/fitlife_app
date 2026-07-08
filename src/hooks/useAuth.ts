// Sessão do Supabase + estado da sincronização, como hooks React.
import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../sync/supabaseClient';
import { assinarEstadoSync, type EstadoSync } from '../sync/engine';

export function useSessao(): { sessao: Session | null; carregando: boolean; disponivel: boolean } {
  const sb = supabase();
  const [sessao, setSessao] = useState<Session | null>(null);
  const [carregando, setCarregando] = useState(!!sb);

  useEffect(() => {
    if (!sb) return;
    sb.auth.getSession().then(({ data }) => {
      setSessao(data.session);
      setCarregando(false);
    });
    const { data: sub } = sb.auth.onAuthStateChange((_ev, s) => setSessao(s));
    return () => sub.subscription.unsubscribe();
  }, [sb]);

  return { sessao, carregando, disponivel: !!sb };
}

export function useEstadoSync(): EstadoSync {
  const [estado, setEstado] = useState<EstadoSync>({ status: 'desativado' });
  useEffect(() => assinarEstadoSync(setEstado), []);
  return estado;
}
