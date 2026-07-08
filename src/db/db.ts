import Dexie, { type EntityTable } from 'dexie';
import type {
  ConfigItem,
  EsporteCustom,
  Ficha,
  LogTreino,
  PlanoCorrida,
  PlanoMensal,
} from './types';

class FitLifeDB extends Dexie {
  fichas!: EntityTable<Ficha, 'id'>;
  logs!: EntityTable<LogTreino, 'id'>;
  planosMensais!: EntityTable<PlanoMensal, 'id'>;
  planosCorrida!: EntityTable<PlanoCorrida, 'id'>;
  esportesCustom!: EntityTable<EsporteCustom, 'id'>;
  config!: EntityTable<ConfigItem, 'chave'>;

  constructor() {
    super('fitlife');
    this.version(1).stores({
      fichas: '++id, nome, modalidade, criadoEm',
      logs: '++id, timestamp, modalidade, planoDia',
      planosMensais: '++id, inicio, ativo, criadoEm',
      planosCorrida: '++id, ativo, criadoEm',
      esportesCustom: '++id, &tipo',
      config: '&chave',
    });
  }
}

export const db = new FitLifeDB();

export async function getConfig<T>(chave: string, padrao: T): Promise<T> {
  const item = await db.config.get(chave);
  return item ? (item.valor as T) : padrao;
}

export async function setConfig(chave: string, valor: unknown): Promise<void> {
  await db.config.put({ chave, valor });
}

export async function planoMensalAtivo(): Promise<PlanoMensal | undefined> {
  return db.planosMensais.where('ativo').equals(1).last();
}

export async function planoCorridaAtivo(): Promise<PlanoCorrida | undefined> {
  return db.planosCorrida.where('ativo').equals(1).last();
}
