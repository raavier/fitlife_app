import { describe, it, expect } from 'vitest';
import { deveAplicarRemoto, paraRemoto } from '../engine';

describe('deveAplicarRemoto (last-write-wins)', () => {
  const t = (ms: number) => new Date(ms).toISOString();

  it('aplica quando não existe versão local', () => {
    expect(deveAplicarRemoto(undefined, t(1000))).toBe(true);
  });

  it('aplica quando o remoto é mais novo', () => {
    expect(deveAplicarRemoto(1000, t(2000))).toBe(true);
  });

  it('mantém o local quando ele é mais novo (será enviado no push)', () => {
    expect(deveAplicarRemoto(3000, t(2000))).toBe(false);
  });

  it('empate mantém o local (evita eco do próprio push)', () => {
    expect(deveAplicarRemoto(2000, t(2000))).toBe(false);
  });
});

describe('paraRemoto', () => {
  it('remove o id numérico local e preserva o resto', () => {
    const r = paraRemoto({
      id: 7,
      uuid: 'abc',
      updatedEm: 123,
      nome: 'Ficha A',
    } as never);
    expect(r).toEqual({ uuid: 'abc', updatedEm: 123, nome: 'Ficha A' });
    expect('id' in r).toBe(false);
  });
});
