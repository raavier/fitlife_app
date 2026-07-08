import { NavLink, Route, Routes } from 'react-router-dom';
import HomePage from './pages/HomePage';
import TreinosPage from './pages/TreinosPage';
import GerarFichaPage from './pages/GerarFichaPage';
import FichaDetalhePage from './pages/FichaDetalhePage';
import RegistrarSessaoPage from './pages/RegistrarSessaoPage';
import RegistrarCorridaPage from './pages/RegistrarCorridaPage';
import RegistrarExtraPage from './pages/RegistrarExtraPage';
import PlanoPage from './pages/PlanoPage';
import CorridaPage from './pages/CorridaPage';
import HistoricoPage from './pages/HistoricoPage';
import RelatorioPage from './pages/RelatorioPage';
import AjustesPage from './pages/AjustesPage';
import TutorialChavesPage from './pages/TutorialChavesPage';

const ABAS = [
  { para: '/', rotulo: 'Hoje', icone: '🏠' },
  { para: '/treinos', rotulo: 'Treinos', icone: '💪' },
  { para: '/plano', rotulo: 'Plano', icone: '📅' },
  { para: '/relatorio', rotulo: 'Relatório', icone: '📊' },
  { para: '/ajustes', rotulo: 'Ajustes', icone: '⚙️' },
];

export default function App() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col">
      <main className="flex-1 px-4 pb-24 pt-4">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/treinos" element={<TreinosPage />} />
          <Route path="/treinos/gerar/:modalidade" element={<GerarFichaPage />} />
          <Route path="/treinos/:id" element={<FichaDetalhePage />} />
          <Route path="/registrar/sessao/:fichaId" element={<RegistrarSessaoPage />} />
          <Route path="/registrar/corrida" element={<RegistrarCorridaPage />} />
          <Route path="/registrar/extra" element={<RegistrarExtraPage />} />
          <Route path="/plano" element={<PlanoPage />} />
          <Route path="/corrida" element={<CorridaPage />} />
          <Route path="/historico" element={<HistoricoPage />} />
          <Route path="/relatorio" element={<RelatorioPage />} />
          <Route path="/ajustes" element={<AjustesPage />} />
          <Route path="/ajustes/tutorial-chaves" element={<TutorialChavesPage />} />
        </Routes>
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-800 bg-slate-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-lg justify-around pb-[env(safe-area-inset-bottom)]">
          {ABAS.map((a) => (
            <NavLink
              key={a.para}
              to={a.para}
              end={a.para === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-3 py-2 text-[11px] font-medium ${
                  isActive ? 'text-emerald-400' : 'text-slate-500'
                }`
              }
            >
              <span className="text-lg leading-none">{a.icone}</span>
              {a.rotulo}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
