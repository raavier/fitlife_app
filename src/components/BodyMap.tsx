// Mapa corporal (heatmap) — silhueta estilizada frente/costas em SVG,
// com regiões musculares clicáveis coloridas pelo status de recuperação.
import type { Musculo, RecuperacaoMusculo } from '../domain';

type Estados = Partial<Record<Musculo, RecuperacaoMusculo>>;

interface Props {
  estados: Estados;
  selecionado?: Musculo | null;
  onSelect: (m: Musculo) => void;
}

const COR: Record<string, string> = {
  pronto: '#10b981',
  recuperando: '#eab308',
  fadigado: '#ef4444',
  sem_dados: '#334155',
};

function corDe(estados: Estados, m: Musculo): string {
  const e = estados[m];
  if (!e || e.fadiga <= 0.01) return e ? COR.pronto : COR.sem_dados;
  return COR[e.status];
}

interface Regiao {
  musculo: Musculo;
  d: string; // path
  espelhar?: boolean; // desenhar também espelhado no eixo x=100
}

// Silhueta ~200x330. Regiões desenhadas no lado esquerdo e espelhadas.
const FRENTE: Regiao[] = [
  { musculo: 'trapezio', d: 'M82,52 L98,52 L98,60 L78,60 Z', espelhar: true },
  { musculo: 'ombro_anterior', d: 'M62,62 a11,11 0 0 1 20,-2 l-2,14 -16,0 Z', espelhar: true },
  { musculo: 'ombro_lateral', d: 'M60,60 a12,12 0 0 0 -8,12 l8,6 4,-14 Z', espelhar: true },
  { musculo: 'peito', d: 'M70,66 Q98,62 98,70 L98,94 Q84,102 72,92 Q68,78 70,66 Z', espelhar: true },
  { musculo: 'biceps', d: 'M52,82 Q62,80 64,88 L60,122 Q52,126 48,118 Z', espelhar: true },
  { musculo: 'antebraco', d: 'M46,124 L60,126 Q58,152 52,166 Q44,166 42,158 Z', espelhar: true },
  { musculo: 'core', d: 'M76,98 L98,102 L98,158 L80,158 Q74,128 76,98 Z', espelhar: true },
  { musculo: 'abdutores', d: 'M64,166 Q72,162 74,170 L72,204 Q64,206 60,198 Z', espelhar: true },
  { musculo: 'quadriceps', d: 'M74,164 Q94,160 96,170 L92,238 Q82,246 76,236 Q70,196 74,164 Z', espelhar: true },
  { musculo: 'adutores', d: 'M96,172 L98,172 L98,214 Q94,218 92,210 Z', espelhar: true },
  { musculo: 'panturrilha', d: 'M78,252 Q90,248 92,258 L88,300 Q80,304 76,294 Z', espelhar: true },
];

const COSTAS: Regiao[] = [
  { musculo: 'trapezio', d: 'M84,48 L98,48 L98,86 L84,82 L74,62 Z', espelhar: true },
  { musculo: 'ombro_posterior', d: 'M60,60 a12,12 0 0 1 22,0 l-4,14 -16,-2 Z', espelhar: true },
  { musculo: 'triceps', d: 'M50,80 Q62,78 64,86 L58,120 Q50,124 46,116 Z', espelhar: true },
  { musculo: 'antebraco', d: 'M44,122 L58,124 Q56,150 50,164 Q42,164 40,156 Z', espelhar: true },
  { musculo: 'dorsal', d: 'M70,86 L98,90 L98,132 Q84,140 74,128 Q68,106 70,86 Z', espelhar: true },
  { musculo: 'lombar', d: 'M84,134 L98,136 L98,160 L84,160 Q82,146 84,134 Z', espelhar: true },
  { musculo: 'gluteo', d: 'M74,162 Q96,158 98,168 L98,192 Q84,200 74,190 Q70,174 74,162 Z', espelhar: true },
  { musculo: 'posterior_coxa', d: 'M74,196 Q94,192 96,202 L92,248 Q82,256 76,246 Q70,220 74,196 Z', espelhar: true },
  { musculo: 'panturrilha', d: 'M78,258 Q92,254 94,264 L88,306 Q80,310 76,300 Z', espelhar: true },
];

function Silhueta({
  regioes,
  titulo,
  estados,
  selecionado,
  onSelect,
}: Props & { regioes: Regiao[]; titulo: string }) {
  return (
    <div className="flex flex-col items-center">
      <svg viewBox="30 20 140 300" className="h-64 w-auto" role="img" aria-label={`Mapa muscular — ${titulo}`}>
        {/* contorno base */}
        <g fill="#1e293b" stroke="#475569" strokeWidth="1">
          <circle cx="100" cy="34" r="14" />
          <path d="M84,50 Q100,56 116,50 L124,58 Q136,60 140,74 L152,128 Q156,164 148,168 L138,166 Q134,170 138,176 L134,180 Q128,178 128,170 L136,120 130,96 128,160 Q132,168 126,244 L122,252 Q126,300 120,308 L124,316 108,316 112,306 108,252 104,220 100,196 96,220 92,252 88,306 92,316 76,316 80,308 Q74,300 78,252 L74,244 Q68,168 72,160 L70,96 64,120 72,170 Q72,178 66,180 L62,176 Q66,170 62,166 L52,168 Q44,164 48,128 L60,74 Q64,60 76,58 Z" />
      </g>
        {regioes.map((r) => {
          const cor = corDe(estados, r.musculo);
          const sel = selecionado === r.musculo;
          const comum = {
            fill: cor,
            fillOpacity: 0.85,
            stroke: sel ? '#f8fafc' : '#0f172a',
            strokeWidth: sel ? 2 : 0.8,
            cursor: 'pointer',
            onClick: () => onSelect(r.musculo),
          } as const;
          return (
            <g key={r.musculo}>
              <path d={r.d} {...comum}>
                <title>{r.musculo}</title>
              </path>
              {r.espelhar && (
                <path d={r.d} transform="translate(200,0) scale(-1,1)" {...comum}>
                  <title>{r.musculo}</title>
                </path>
              )}
            </g>
          );
        })}
      </svg>
      <span className="mt-1 text-xs text-slate-400">{titulo}</span>
    </div>
  );
}

export default function BodyMap(props: Props) {
  return (
    <div>
      <div className="grid grid-cols-2 gap-2">
        <Silhueta {...props} regioes={FRENTE} titulo="Frente" />
        <Silhueta {...props} regioes={COSTAS} titulo="Costas" />
      </div>
      <div className="mt-2 flex justify-center gap-4 text-xs text-slate-400">
        <span className="flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-full" style={{ background: COR.pronto }} /> Pronto</span>
        <span className="flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-full" style={{ background: COR.recuperando }} /> Recuperando</span>
        <span className="flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-full" style={{ background: COR.fadigado }} /> Fadigado</span>
      </div>
    </div>
  );
}
