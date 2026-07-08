// Timer de descanso embutido no registro de treino.
import { useEffect, useRef, useState } from 'react';

interface Props {
  segundosPadrao: number;
}

export default function RestTimer({ segundosPadrao }: Props) {
  const [restante, setRestante] = useState(segundosPadrao);
  const [rodando, setRodando] = useState(false);
  const fim = useRef<number>(0);

  useEffect(() => {
    setRestante(segundosPadrao);
    setRodando(false);
  }, [segundosPadrao]);

  useEffect(() => {
    if (!rodando) return;
    const id = setInterval(() => {
      const resta = Math.max(0, Math.round((fim.current - Date.now()) / 1000));
      setRestante(resta);
      if (resta === 0) {
        setRodando(false);
        avisar();
      }
    }, 250);
    return () => clearInterval(id);
  }, [rodando]);

  function iniciar(seg?: number) {
    const s = seg ?? restante;
    if (s <= 0) return;
    fim.current = Date.now() + s * 1000;
    setRestante(s);
    setRodando(true);
  }

  function avisar() {
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.value = 0.08;
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    } catch {
      // sem áudio disponível — a vibração/visual já cobre
    }
  }

  const min = Math.floor(restante / 60);
  const seg = restante % 60;

  return (
    <div className="flex items-center gap-3 rounded-xl bg-slate-800/70 p-3">
      <span
        className={`font-mono text-2xl tabular-nums ${restante === 0 ? 'text-emerald-400' : 'text-slate-100'}`}
      >
        {min}:{String(seg).padStart(2, '0')}
      </span>
      <div className="flex flex-1 flex-wrap justify-end gap-2">
        {rodando ? (
          <button className="btn-ghost px-3 py-1.5" onClick={() => setRodando(false)}>
            Pausar
          </button>
        ) : (
          <button className="btn-primary px-3 py-1.5" onClick={() => iniciar()}>
            Descanso
          </button>
        )}
        <button
          className="btn-ghost px-3 py-1.5"
          onClick={() => {
            setRodando(false);
            setRestante(segundosPadrao);
          }}
        >
          Zerar
        </button>
        <button className="btn-ghost px-2 py-1.5" onClick={() => iniciar(restante + 30)}>
          +30s
        </button>
      </div>
    </div>
  );
}
