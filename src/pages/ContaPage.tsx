// Conta e sincronização: login por link mágico (e-mail) ou Google,
// status da sync e configuração do projeto Supabase.
import { useState } from 'react';
import { Aviso, Carregando, Secao } from '../components/ui';
import { useEstadoSync, useSessao } from '../hooks/useAuth';
import { sincronizar } from '../sync/engine';
import { salvarSupabaseConfig, supabase } from '../sync/supabaseClient';

export default function ContaPage() {
  const { sessao, carregando, disponivel } = useSessao();

  return (
    <div>
      <header className="mb-4">
        <h1 className="text-xl font-bold">Conta e sincronização</h1>
        <p className="text-sm text-slate-400">
          O app continua 100% offline-first: seus dados vivem no aparelho e, com login, são
          sincronizados com a nuvem para backup e uso em vários dispositivos.
        </p>
      </header>

      {!disponivel ? (
        <FormConfigSupabase />
      ) : carregando ? (
        <Carregando texto="Verificando sessão…" />
      ) : sessao ? (
        <PainelLogado email={sessao.user.email ?? sessao.user.id} />
      ) : (
        <FormLogin />
      )}
    </div>
  );
}

/** Sem projeto Supabase configurado: orienta e permite colar URL + anon key. */
function FormConfigSupabase() {
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [erro, setErro] = useState('');

  function salvar() {
    if (!/^https:\/\/.+\.supabase\.co$/.test(url.trim())) {
      setErro('URL inválida — deve ser algo como https://abcdefgh.supabase.co');
      return;
    }
    if (anonKey.trim().length < 20) {
      setErro('Cole a anon key completa (Settings → API Keys do seu projeto).');
      return;
    }
    salvarSupabaseConfig(url, anonKey);
    window.location.reload(); // recria o cliente com a nova config
  }

  return (
    <>
      <Aviso tipo="aviso">
        A sincronização é <strong>opcional</strong> e está desativada — o app funciona normalmente
        só com os dados locais. Para ativar, conecte um projeto Supabase (grátis).
      </Aviso>
      <Secao titulo="Como criar o projeto (uma vez só, ~5 min)">
        <div className="card space-y-2 text-sm text-slate-300">
          <ol className="list-inside list-decimal space-y-1.5">
            <li>
              Crie uma conta grátis em{' '}
              <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-emerald-400 underline">
                supabase.com ↗
              </a>{' '}
              e crie um projeto (free tier, sem cartão).
            </li>
            <li>
              No projeto, abra <strong>SQL Editor</strong> e rode o conteúdo de{' '}
              <code className="rounded bg-slate-800 px-1">supabase/schema.sql</code> (está no
              repositório do app) — cria a tabela e as regras de segurança por usuário.
            </li>
            <li>
              Em <strong>Authentication → Sign In / Up</strong>, o login por e-mail (magic link) já
              vem ativo. Para "Entrar com Google", ative o provedor Google seguindo o assistente.
            </li>
            <li>
              Copie em <strong>Settings → API</strong> a <em>Project URL</em> e a{' '}
              <em>anon public key</em> e cole abaixo.
            </li>
          </ol>
        </div>
      </Secao>
      <Secao titulo="Conectar projeto">
        <div className="card space-y-2">
          <label>
            <span className="label">Project URL</span>
            <input className="input" placeholder="https://abcdefgh.supabase.co" value={url} onChange={(e) => setUrl(e.target.value)} />
          </label>
          <label>
            <span className="label">Anon public key</span>
            <input type="password" className="input" placeholder="eyJhbGciOi…" value={anonKey} onChange={(e) => setAnonKey(e.target.value)} />
          </label>
          {erro && <Aviso tipo="erro">{erro}</Aviso>}
          <button className="btn-primary w-full" onClick={salvar}>
            Conectar
          </button>
          <p className="text-xs text-slate-500">
            A anon key é pública por design (a segurança vem das políticas RLS por usuário). Ela fica
            salva só neste dispositivo.
          </p>
        </div>
      </Secao>
    </>
  );
}

function FormLogin() {
  const [email, setEmail] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function linkMagico() {
    setErro('');
    if (!/.+@.+\..+/.test(email)) {
      setErro('Digite um e-mail válido.');
      return;
    }
    setEnviando(true);
    try {
      const { error } = await supabase()!.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) throw error;
      setEnviado(true);
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setEnviando(false);
    }
  }

  async function google() {
    setErro('');
    try {
      const { error } = await supabase()!.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <Secao titulo="Entrar">
      <div className="card space-y-3">
        {enviado ? (
          <Aviso tipo="ok">
            Link enviado para <strong>{email}</strong>! Abra o e-mail neste aparelho e toque no link
            para entrar. (Vale por pouco tempo; olhe o spam se não chegar.)
          </Aviso>
        ) : (
          <>
            <label>
              <span className="label">E-mail (login sem senha, por link mágico)</span>
              <input
                type="email"
                className="input"
                placeholder="voce@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            {erro && <Aviso tipo="erro">{erro}</Aviso>}
            <button className="btn-primary w-full" onClick={linkMagico} disabled={enviando}>
              {enviando ? 'Enviando…' : 'Enviar link de acesso'}
            </button>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="h-px flex-1 bg-slate-800" /> ou <span className="h-px flex-1 bg-slate-800" />
            </div>
            <button className="btn-ghost w-full" onClick={google}>
              <span className="font-bold">G</span> Entrar com Google
            </button>
          </>
        )}
      </div>
    </Secao>
  );
}

function PainelLogado({ email }: { email: string }) {
  const estado = useEstadoSync();
  const [saindo, setSaindo] = useState(false);

  const rotulo: Record<string, string> = {
    ocioso: '✅ Sincronizado',
    sincronizando: '⏳ Sincronizando…',
    erro: '⚠️ Erro na última sincronização',
    deslogado: '—',
    desativado: '—',
  };

  return (
    <>
      <Secao titulo="Sessão">
        <div className="card space-y-3 text-sm">
          <p>
            Logado como <strong>{email}</strong>
          </p>
          <p className="text-slate-400">
            {rotulo[estado.status]}
            {estado.ultimaSync && (
              <> · última sync {new Date(estado.ultimaSync).toLocaleTimeString('pt-BR')}</>
            )}
          </p>
          {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
          <div className="flex gap-2">
            <button className="btn-primary flex-1" onClick={() => sincronizar()} disabled={estado.status === 'sincronizando'}>
              Sincronizar agora
            </button>
            <button
              className="btn-ghost"
              disabled={saindo}
              onClick={async () => {
                setSaindo(true);
                await supabase()!.auth.signOut();
                setSaindo(false);
              }}
            >
              Sair
            </button>
          </div>
        </div>
      </Secao>
      <Secao titulo="Como funciona">
        <div className="card space-y-1.5 text-sm text-slate-300">
          <p>• Seus treinos continuam salvos no aparelho e funcionam sem internet.</p>
          <p>• Com rede, tudo sobe para o seu projeto Supabase (fichas, logs, planos, esportes).</p>
          <p>• Em outro aparelho, faça login com o mesmo e-mail e os dados descem sozinhos.</p>
          <p>• Conflitos: vale a alteração mais recente (last-write-wins).</p>
          <p className="text-xs text-slate-500">
            As chaves de IA <strong>não</strong> são sincronizadas — ficam só em cada dispositivo.
          </p>
        </div>
      </Secao>
    </>
  );
}
