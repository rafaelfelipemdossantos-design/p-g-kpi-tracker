import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithCustomToken, 
  signInAnonymously, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot, 
  updateDoc
} from 'firebase/firestore';
import { 
  Store, 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle2, 
  BarChart3, 
  Camera,
  Loader2,
  Cloud,
  FileDown,
  History,
  Calendar,
  User,
  AlertTriangle
} from 'lucide-react';

// NOTA: Estas variáveis devem ser preenchidas com os seus dados do Firebase Console
// Se estiver a testar no Canvas, elas são injetadas automaticamente.
const firebaseConfig = typeof __firebase_config !== 'undefined' 
  ? JSON.parse(__firebase_config) 
  : {
      apiKey: "SUA_API_KEY",
      authDomain: "SEU_PROJETO.firebaseapp.com",
      projectId: "SEU_PROJETO",
      storageBucket: "SEU_PROJETO.appspot.com",
      messagingSenderId: "ID",
      appId: "APP_ID"
    };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'p-g-kpi-tracker';

const App = () => {
  const [user, setUser] = useState(null);
  const [promoterName, setPromoterName] = useState(localStorage.getItem('promoter_name') || '');
  const [view, setView] = useState(promoterName ? 'stores' : 'login');
  const [selectedStore, setSelectedStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stores, setStores] = useState([]);
  const [currentKpis, setCurrentKpis] = useState([]);

  const motivosNaoExecucao = [
    "Ruptura (Falta de Produto)",
    "Falta de Material de Visibilidade",
    "Espaço Ocupado por Concorrência",
    "Loja não autorizou",
    "Produto em Trânsito",
    "Outro"
  ];

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (e) { console.error(e); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const storesRef = collection(db, 'artifacts', appId, 'public', 'data', 'stores');
    const unsubscribe = onSnapshot(storesRef, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setStores(list);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (promoterName.trim()) {
      localStorage.setItem('promoter_name', promoterName);
      setView('stores');
    }
  };

  const startAudit = (store) => {
    setSelectedStore(store);
    setCurrentKpis(store.kpis || []);
    setView('audit');
  };

  const saveAudit = async () => {
    setSaving(true);
    const completed = currentKpis.filter(k => k.status).length;
    const ref = doc(db, 'artifacts', appId, 'public', 'data', 'stores', selectedStore.id);
    await updateDoc(ref, {
      status: completed === 6 ? "Concluído" : "Parcial",
      completedKpis: completed,
      lastUpdate: new Date().toLocaleString(),
      updatedBy: promoterName,
      kpis: currentKpis
    });
    setSaving(false);
    setView('stores');
  };

  if (view === 'login') return (
    <div className="h-screen bg-blue-600 flex items-center justify-center p-6 text-slate-800">
      <div className="bg-white p-8 rounded-3xl w-full max-w-sm shadow-2xl">
        <h2 className="text-2xl font-black mb-6 text-center">Identificação P&G</h2>
        <input 
          className="w-full border-2 p-4 rounded-xl mb-4" 
          placeholder="Nome do Promotor"
          value={promoterName}
          onChange={e => setPromoterName(e.target.value)}
        />
        <button onClick={handleLogin} className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl">ENTRAR</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-blue-600 text-white p-4 sticky top-0 flex justify-between items-center shadow-md">
        <span className="font-black">P&G KPI</span>
        <span className="text-xs uppercase opacity-80">{promoterName}</span>
      </header>

      <main className="p-4 max-w-lg mx-auto">
        {view === 'stores' && stores.map(s => (
          <div key={s.id} onClick={() => startAudit(s)} className="bg-white p-4 rounded-2xl mb-3 shadow-sm flex justify-between items-center border border-slate-200">
            <div>
              <p className="font-bold">{s.name}</p>
              <p className="text-[10px] text-slate-400">Última: {s.lastUpdate || 'Pendente'}</p>
            </div>
            <span className="text-xs font-black text-blue-600">{s.completedKpis || 0}/6</span>
          </div>
        ))}

        {view === 'audit' && (
          <div className="space-y-4">
            <button onClick={() => setView('stores')} className="text-blue-600 font-bold flex items-center gap-1"><ChevronLeft size={16}/> VOLTAR</button>
            <h3 className="font-black text-lg">{selectedStore.name}</h3>
            {currentKpis.map(kpi => (
              <div key={kpi.id} className="bg-white p-4 rounded-xl border border-slate-200">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-sm">{kpi.title}</span>
                  <input 
                    type="checkbox" 
                    checked={kpi.status} 
                    onChange={() => {
                      const next = [...currentKpis];
                      const idx = next.findIndex(x => x.id === kpi.id);
                      next[idx].status = !next[idx].status;
                      setCurrentKpis(next);
                    }}
                    className="h-6 w-6"
                  />
                </div>
                {!kpi.status && (
                  <select 
                    className="w-full text-xs p-2 bg-amber-50 border border-amber-200 rounded"
                    value={kpi.motivo}
                    onChange={(e) => {
                      const next = [...currentKpis];
                      const idx = next.findIndex(x => x.id === kpi.id);
                      next[idx].motivo = e.target.value;
                      setCurrentKpis(next);
                    }}
                  >
                    <option value="">Selecione o motivo...</option>
                    {motivosNaoExecucao.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                )}
              </div>
            ))}
            <button onClick={saveAudit} disabled={saving} className="w-full bg-blue-600 text-white font-black py-5 rounded-2xl shadow-xl">
              {saving ? 'A GUARDAR...' : 'FINALIZAR AUDITORIA'}
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
