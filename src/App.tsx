import React, { useState } from 'react';
import { StoreProvider, useStore } from './store/StoreContext';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { Sidebar } from './components/Sidebar';
import { Calendar } from './components/Calendar';
import { AuthPage } from './components/AuthPage';
import { RequestsPanel } from './components/RequestsPanel';
import { DndContext, DragOverlay, useSensor, useSensors, PointerSensor, type DragStartEvent, type DragEndEvent } from '@dnd-kit/core';
import { addMonths, subMonths, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Undo2, Redo2, Download, Upload, ChevronLeft, ChevronRight, Wand2, Sparkles } from 'lucide-react';
import { generateSchedule } from './utils/autoSchedule';
import { generateAISchedule } from './utils/aiScheduler';
import type { Doctor } from './types';
import './index.css';

// ─── Main app content (admin = full access, doctor = read-only) ──────────────
const AppContent = ({ readOnly }: { readOnly: boolean }) => {
  const { state, dispatch } = useStore();
  const { profile, logout } = useAuth();
  const [activeDoctor, setActiveDoctor] = useState<Doctor | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragStart = (event: DragStartEvent) => setActiveDoctor(event.active.data.current?.doctor ?? null);

  const handleDragEnd = (event: DragEndEvent) => {
    const { over, active } = event;
    setActiveDoctor(null);
    if (over && active.data.current?.doctor && over.data.current) {
      const { dateStr, type } = over.data.current as { dateStr: string; type: string };
      const doctorId = active.data.current.doctor.id;
      const alreadyAssigned = state.shifts.find(s => s.dateStr === dateStr && s.type === type && s.doctorId === doctorId);
      if (!alreadyAssigned) {
        dispatch({ type: 'ADD_SHIFT', payload: { dateStr, type: type as any, doctorId } });
      }
    }
  };

  const exportData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ doctors: state.doctors, shifts: state.shifts }));
    const a = document.createElement('a');
    a.setAttribute("href", dataStr);
    a.setAttribute("download", "turnos_export.json");
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (parsed.doctors && parsed.shifts) {
            alert("Para importar datos, esta característica se habilitará en la próxima actualización de estado.");
          }
        } catch { alert("Error importando archivo."); }
      };
      reader.readAsText(e.target.files[0]);
    }
  };

  const handleAutoSchedule = () => {
    const newShifts = generateSchedule(state.currentMonth, state.doctors, state.shifts);
    if (newShifts.length > 0) {
      dispatch({ type: 'ADD_SHIFTS', payload: newShifts });
    } else {
      alert("No se pudieron asignar más turnos. Quizás faltan médicos para cubrir la cuota respetando las reglas de descanso.");
    }
  };

  const handleAISchedule = async () => {
    setAiLoading(true);
    try {
      const { shifts, reasoning } = await generateAISchedule(state.currentMonth, state.doctors, state.shifts);
      if (shifts.length > 0) {
        dispatch({ type: 'ADD_SHIFTS', payload: shifts });
        alert("Sugerencia de IA aplicada.\n\nRazonamiento: " + reasoning);
      } else {
        alert("La IA no encontró turnos adicionales válidos para asignar.");
      }
    } catch (err: any) {
      alert("Error con la IA: " + err.message);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="app-container">
        {!readOnly && <Sidebar />}
        <div className="main-content">
          <div className="header glass" style={{ padding: '12px 20px', marginBottom: '24px' }}>
            {/* Month nav */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button className="btn-icon" onClick={() => dispatch({ type: 'SET_MONTH', payload: subMonths(state.currentMonth, 1) })}>
                <ChevronLeft />
              </button>
              <h1 style={{ margin: 0, fontSize: '1.4rem', textTransform: 'capitalize' }}>
                {format(state.currentMonth, 'MMMM yyyy', { locale: es })}
              </h1>
              <button className="btn-icon" onClick={() => dispatch({ type: 'SET_MONTH', payload: addMonths(state.currentMonth, 1) })}>
                <ChevronRight />
              </button>
            </div>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', alignSelf: 'center' }}>
                {profile?.email} · {profile?.role}
              </span>
              <button className="btn" style={{ background: 'white' }} onClick={logout}>
                Cerrar sesión
              </button>

              {!readOnly && (
                <>
                  <button 
                    className="btn" 
                    style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)', color: 'white' }} 
                    onClick={handleAISchedule}
                    disabled={aiLoading}
                  >
                    <Sparkles size={18} /> {aiLoading ? 'Pensando...' : 'Optimizar con IA'}
                  </button>
                  <button className="btn" style={{ background: 'white', color: 'var(--primary)', borderColor: 'var(--primary)', border: '1px solid' }} onClick={handleAutoSchedule}>
                    <Wand2 size={18} /> Autocompletar
                  </button>
                  <button className="btn" style={{ background: 'white', opacity: state.past.length === 0 ? 0.5 : 1 }} onClick={() => dispatch({ type: 'UNDO' })} disabled={state.past.length === 0}>
                    <Undo2 size={18} /> Deshacer
                  </button>
                  <button className="btn" style={{ background: 'white', opacity: state.future.length === 0 ? 0.5 : 1 }} onClick={() => dispatch({ type: 'REDO' })} disabled={state.future.length === 0}>
                    <Redo2 size={18} /> Rehacer
                  </button>
                  <button className="btn btn-primary" onClick={exportData}>
                    <Download size={18} /> Exportar
                  </button>
                  <label className="btn btn-primary" style={{ cursor: 'pointer' }}>
                    <Upload size={18} /> Importar
                    <input type="file" accept=".json" style={{ display: 'none' }} onChange={importData} />
                  </label>
                </>
              )}
            </div>
          </div>

          <Calendar readOnly={readOnly} />
          <RequestsPanel />
        </div>
      </div>
      <DragOverlay>
        {!readOnly && activeDoctor ? (
          <div className="doctor-card" style={{ opacity: 0.8, cursor: 'grabbing', background: 'white', padding: '12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 10px 15px rgba(0,0,0,0.1)' }}>
            <div className="color-dot" style={{ backgroundColor: activeDoctor.color, width: '12px', height: '12px', borderRadius: '50%' }}></div>
            <span>{activeDoctor.name}</span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

// ─── Root router ─────────────────────────────────────────────────────────────
const AppRoot = () => {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="glass" style={{ padding: 20 }}>Cargando…</div>
      </div>
    );
  }

  if (!user || !profile) {
    return <AuthPage />;
  }

  const readOnly = profile.role !== 'admin';
  return (
    <StoreProvider syncEnabled={!readOnly}>
      <AppContent readOnly={readOnly} />
    </StoreProvider>
  );
};

// ─── App entry ───────────────────────────────────────────────────────────────
function App() {
  return (
    <AuthProvider>
      <AppRoot />
    </AuthProvider>
  );
}

export default App;
