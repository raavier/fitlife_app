// Pequenos componentes de UI compartilhados.
import type { ReactNode } from 'react';
import type { Qualidade } from '../db/types';
import { NOME_QUALIDADE } from '../lib/labels';

export function Secao({ titulo, acao, children }: { titulo: string; acao?: ReactNode; children: ReactNode }) {
  return (
    <section className="mb-5">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">{titulo}</h2>
        {acao}
      </div>
      {children}
    </section>
  );
}

export function QualityPicker({
  valor,
  onChange,
}: {
  valor?: Qualidade;
  onChange: (q: Qualidade) => void;
}) {
  const cores: Record<Qualidade, string> = {
    ruim: 'border-rose-500/50 data-[on=true]:bg-rose-500/30 data-[on=true]:text-rose-200',
    medio: 'border-amber-500/50 data-[on=true]:bg-amber-500/30 data-[on=true]:text-amber-200',
    bom: 'border-emerald-500/50 data-[on=true]:bg-emerald-500/30 data-[on=true]:text-emerald-200',
  };
  return (
    <div className="flex gap-2">
      {(['ruim', 'medio', 'bom'] as Qualidade[]).map((q) => (
        <button
          key={q}
          type="button"
          data-on={valor === q}
          onClick={() => onChange(q)}
          className={`chip flex-1 justify-center py-2.5 text-sm text-slate-300 ${cores[q]}`}
        >
          {NOME_QUALIDADE[q]}
        </button>
      ))}
    </div>
  );
}

export function RpeSlider({ valor, onChange }: { valor: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-slate-400">
        <span>RPE (esforço)</span>
        <span className="font-semibold text-slate-200">{valor}/10</span>
      </div>
      <input
        type="range"
        min={1}
        max={10}
        value={valor}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-emerald-500"
      />
    </div>
  );
}

export function Aviso({ tipo, children }: { tipo: 'erro' | 'aviso' | 'ok'; children: ReactNode }) {
  const estilos = {
    erro: 'border-rose-500/40 bg-rose-500/10 text-rose-200',
    aviso: 'border-amber-500/40 bg-amber-500/10 text-amber-200',
    ok: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200',
  };
  return <div className={`mb-2 rounded-xl border px-3 py-2 text-sm ${estilos[tipo]}`}>{children}</div>;
}

export function Carregando({ texto }: { texto: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-slate-800/60 px-4 py-3 text-sm text-slate-300">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-500 border-t-emerald-400" />
      {texto}
    </div>
  );
}
