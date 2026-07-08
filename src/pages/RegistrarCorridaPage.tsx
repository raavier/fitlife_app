// Registro de corrida: tipo, distância, duração, pace, RPE e qualidade (spec seção 2).
import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Aviso, QualityPicker, RpeSlider } from '../components/ui';
import { db } from '../db/db';
import type { Qualidade, TipoCorrida } from '../db/types';
import { NOME_TIPO_CORRIDA, pace } from '../lib/labels';

export default function RegistrarCorridaPage() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [tipo, setTipo] = useState<TipoCorrida>('facil');
  const [distancia, setDistancia] = useState(5);
  const [duracao, setDuracao] = useState(30);
  const [rpe, setRpe] = useState(6);
  const [qualidade, setQualidade] = useState<Qualidade | undefined>();
  const [observacao, setObservacao] = useState('');
  const [erro, setErro] = useState('');

  const paceCalc = useMemo(() => pace(distancia, duracao), [distancia, duracao]);

  async function salvar() {
    if (distancia <= 0 || duracao <= 0) {
      setErro('Informe distância e duração maiores que zero.');
      return;
    }
    if (!qualidade) {
      setErro('Dê a nota de qualidade da corrida.');
      return;
    }
    await db.logs.add({
      timestamp: Date.now(),
      modalidade: 'corrida',
      planoDia: params.get('plano') ?? undefined,
      corrida: { tipo, distanciaKm: distancia, duracaoMin: duracao },
      rpe,
      qualidade,
      observacao: observacao || undefined,
      status: 'feito',
    });
    nav('/');
  }

  return (
    <div>
      <header className="mb-4">
        <h1 className="text-xl font-bold">Registrar corrida</h1>
      </header>

      <div className="card space-y-3">
        <label>
          <span className="label">Tipo de treino</span>
          <select className="input" value={tipo} onChange={(e) => setTipo(e.target.value as TipoCorrida)}>
            {Object.entries(NOME_TIPO_CORRIDA).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-3 gap-2">
          <label>
            <span className="label">Distância (km)</span>
            <input type="number" min={0} step={0.1} className="input" value={distancia} onChange={(e) => setDistancia(Number(e.target.value))} />
          </label>
          <label>
            <span className="label">Duração (min)</span>
            <input type="number" min={0} className="input" value={duracao} onChange={(e) => setDuracao(Number(e.target.value))} />
          </label>
          <div>
            <span className="label">Pace</span>
            <div className="input flex items-center justify-center font-mono">{paceCalc}</div>
          </div>
        </div>
        <RpeSlider valor={rpe} onChange={setRpe} />
        <div>
          <span className="label">Qualidade</span>
          <QualityPicker valor={qualidade} onChange={setQualidade} />
        </div>
        <label>
          <span className="label">Observação (opcional)</span>
          <input className="input" value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="ex.: pernas pesadas" />
        </label>
        {erro && <Aviso tipo="erro">{erro}</Aviso>}
        <button className="btn-primary w-full" onClick={salvar}>
          Salvar corrida
        </button>
      </div>
    </div>
  );
}
