// Hooks reativos sobre o Dexie (liveQuery) — o coração dos dados na UI.
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useMemo, useState } from 'react';
import { db } from '../db/db';
import type { LogTreino, PlanoMensal } from '../db/types';
import { logsParaEstimulos } from '../lib/estimulos';
import {
  MUSCULOS,
  recuperacaoDoMusculo,
  volumeSemanalPorMusculo,
  type Estimulo,
  type Musculo,
  type Nivel,
  type RecuperacaoMusculo,
} from '../domain';

const DIA_MS = 24 * 3600 * 1000;

export function useLogs(): LogTreino[] | undefined {
  return useLiveQuery(() => db.logs.orderBy('timestamp').reverse().toArray(), []);
}

export function useEstimulos(): Estimulo[] | undefined {
  const logs = useLiveQuery(() => db.logs.toArray(), []);
  const custom = useLiveQuery(() => db.esportesCustom.toArray(), []);
  return useMemo(() => {
    if (!logs || !custom) return undefined;
    return logsParaEstimulos(logs, custom);
  }, [logs, custom]);
}

export function useRecuperacao(): Partial<Record<Musculo, RecuperacaoMusculo>> | undefined {
  const estimulos = useEstimulos();
  // tick por minuto: a fadiga decai com o tempo, então o heatmap "alivia"
  // sozinho mesmo com a tela aberta parada.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);
  return useMemo(() => {
    if (!estimulos) return undefined;
    void tick;
    const agora = Date.now();
    const out: Partial<Record<Musculo, RecuperacaoMusculo>> = {};
    for (const m of MUSCULOS) {
      out[m] = recuperacaoDoMusculo(m, estimulos, agora);
    }
    return out;
  }, [estimulos, tick]);
}

/** Volume da semana corrente (começando na segunda-feira). */
export function useVolumeSemana(): Partial<Record<Musculo, number>> | undefined {
  const estimulos = useEstimulos();
  return useMemo(() => {
    if (!estimulos) return undefined;
    const { inicio, fim } = semanaAtual();
    return volumeSemanalPorMusculo(estimulos, inicio, fim);
  }, [estimulos]);
}

export function semanaAtual(): { inicio: number; fim: number } {
  const agora = new Date();
  const diaSemana = (agora.getDay() + 6) % 7; // 0 = segunda
  const inicio = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() - diaSemana).getTime();
  return { inicio, fim: inicio + 7 * DIA_MS };
}

export function usePlanoMensal(): PlanoMensal | undefined | null {
  const p = useLiveQuery(async () => (await db.planosMensais.where('ativo').equals(1).last()) ?? null, []);
  return p;
}

export function useNivel(): Nivel {
  return (
    useLiveQuery(async () => {
      const c = await db.config.get('nivel');
      return (c?.valor as Nivel) ?? 'intermediario';
    }, []) ?? 'intermediario'
  );
}

/** Km de corrida por semana (últimas n semanas, incluindo a atual). */
export function useKmSemanais(n = 4): number[] | undefined {
  const logs = useLiveQuery(() => db.logs.where('modalidade').equals('corrida').toArray(), []);
  return useMemo(() => {
    if (!logs) return undefined;
    const { inicio } = semanaAtual();
    const out: number[] = [];
    for (let i = n - 1; i >= 0; i--) {
      const ini = inicio - i * 7 * DIA_MS;
      const fim = ini + 7 * DIA_MS;
      const km = logs
        .filter((l) => l.status === 'feito' && l.timestamp >= ini && l.timestamp < fim)
        .reduce((s, l) => s + (l.corrida?.distanciaKm ?? 0), 0);
      out.push(Math.round(km * 10) / 10);
    }
    return out;
  }, [logs, n]);
}
