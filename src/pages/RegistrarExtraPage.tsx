// Atividade extra (esporte avulso) — conta no heatmap via SPORT_MAP ou
// mapeamento manual para esportes fora da lista (spec seção 6c).
import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { Aviso, QualityPicker, RpeSlider } from '../components/ui';
import { db } from '../db/db';
import type { Qualidade } from '../db/types';
import { MUSCULOS, SPORT_MAP, type Musculo } from '../domain';
import { NOME_MUSCULO } from '../lib/labels';

const NOMES_ESPORTES: Record<string, string> = {
  futebol: 'Futebol',
  tenis: 'Tênis / squash / beach tennis',
  ciclismo: 'Ciclismo',
  natacao: 'Natação',
  basquete: 'Basquete',
  volei: 'Vôlei',
};

export default function RegistrarExtraPage() {
  const nav = useNavigate();
  const custom = useLiveQuery(() => db.esportesCustom.toArray(), []);
  const [tipo, setTipo] = useState('futebol');
  const [horas, setHoras] = useState(1);
  const [rpe, setRpe] = useState(6);
  const [qualidade, setQualidade] = useState<Qualidade | undefined>();
  const [erro, setErro] = useState('');
  const [criandoNovo, setCriandoNovo] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [novosMusculos, setNovosMusculos] = useState<Partial<Record<Musculo, number>>>({});

  async function salvar() {
    if (horas <= 0) {
      setErro('Informe a duração.');
      return;
    }
    await db.logs.add({
      timestamp: Date.now(),
      modalidade: 'extra',
      extra: { tipo, horas },
      rpe,
      qualidade,
      status: 'feito',
    });
    nav('/');
  }

  async function salvarNovoEsporte() {
    const id = novoNome.trim().toLowerCase().replace(/\s+/g, '_');
    if (!id) {
      setErro('Dê um nome ao esporte.');
      return;
    }
    if (Object.keys(novosMusculos).length === 0) {
      setErro('Selecione ao menos um músculo trabalhado.');
      return;
    }
    await db.esportesCustom.put({ tipo: id, nome: novoNome.trim(), musculos: novosMusculos });
    setTipo(id);
    setCriandoNovo(false);
    setErro('');
  }

  function alternarMusculo(m: Musculo) {
    setNovosMusculos((old) => {
      const novo = { ...old };
      if (novo[m] !== undefined) delete novo[m];
      else novo[m] = 0.5;
      return novo;
    });
  }

  return (
    <div>
      <header className="mb-4">
        <h1 className="text-xl font-bold">Atividade extra</h1>
        <p className="text-sm text-slate-400">Futebol, tênis… conta no mapa de recuperação.</p>
      </header>

      <div className="card space-y-3">
        <label>
          <span className="label">Esporte</span>
          <select
            className="input"
            value={criandoNovo ? '__novo__' : tipo}
            onChange={(e) => {
              if (e.target.value === '__novo__') setCriandoNovo(true);
              else {
                setCriandoNovo(false);
                setTipo(e.target.value);
              }
            }}
          >
            {Object.keys(SPORT_MAP).map((k) => (
              <option key={k} value={k}>
                {NOMES_ESPORTES[k] ?? k}
              </option>
            ))}
            {custom?.map((c) => (
              <option key={c.tipo} value={c.tipo}>
                {c.nome}
              </option>
            ))}
            <option value="__novo__">+ Cadastrar outro esporte…</option>
          </select>
        </label>

        {criandoNovo && (
          <div className="rounded-xl border border-slate-700 p-3">
            <label>
              <span className="label">Nome do esporte</span>
              <input className="input" value={novoNome} onChange={(e) => setNovoNome(e.target.value)} placeholder="ex.: escalada" />
            </label>
            <span className="label mt-3">Músculos trabalhados (mapeamento manual)</span>
            <div className="flex flex-wrap gap-1.5">
              {MUSCULOS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => alternarMusculo(m)}
                  className={`chip ${
                    novosMusculos[m] !== undefined
                      ? 'border-emerald-500 bg-emerald-500/20 text-emerald-200'
                      : 'border-slate-700 text-slate-400'
                  }`}
                >
                  {NOME_MUSCULO[m]}
                </button>
              ))}
            </div>
            <button className="btn-primary mt-3 w-full" onClick={salvarNovoEsporte}>
              Salvar esporte
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <label>
            <span className="label">Duração (horas)</span>
            <input type="number" min={0.25} step={0.25} className="input" value={horas} onChange={(e) => setHoras(Number(e.target.value))} />
          </label>
          <div className="flex flex-col justify-end">
            <RpeSlider valor={rpe} onChange={setRpe} />
          </div>
        </div>
        <div>
          <span className="label">Qualidade (opcional)</span>
          <QualityPicker valor={qualidade} onChange={setQualidade} />
        </div>
        {erro && <Aviso tipo="erro">{erro}</Aviso>}
        <button className="btn-primary w-full" onClick={salvar} disabled={criandoNovo}>
          Salvar atividade
        </button>
      </div>
    </div>
  );
}
