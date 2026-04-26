import React, { useState } from 'react';
import { StoreProvider, useStore } from './store/StoreContext';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { Sidebar } from './components/Sidebar';
import { Calendar } from './components/Calendar';
import { LoginPage } from './components/LoginPage';
import { DndContext, DragOverlay, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { addMonths, subMonths, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Undo2, Redo2, Download, Upload, ChevronLeft, ChevronRight, Wand2, LogOut, ShieldCheck, User, Stethoscope } from 'lucide-react';
import { generateSchedule } from './utils/autoSchedule';
import './index.css';

// ─── Admin full app ─────────────────────────────────────────────────────────
const AdminApp = () => {
  const { state, dispatch } = useStore();
  const { user, logout } = useAuth();
  const [activeDoctor, setActiveDoctor] = useState<any>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragStart = (event: any) => setActiveDoctor(event.active.data.current.doctor);

  const handleDragEnd = (event: any) => {
    const { over, active } = event;
    setActiveDoctor(null);
    if (over && active.data.current.doctor) {
      const { dateStr, type } = over.data.current;
      const doctorId = active.data.current.doctor.id;
      const alreadyAssigned = state.shifts.find(s => s.dateStr === dateStr && s.type === type && s.doctorId === doctorId);
      if (!alreadyAssigned) {
        dispatch({ type: 'ADD_SHIFT', payload: { dateStr, type, doctorId } });
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

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="app-container">
        <Sidebar />
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

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <button className="btn" style={{ background: 'white', color: 'var(--primary)', border: '1px solid var(--primary)' }} onClick={handleAutoSchedule}>
                <Wand2 size={16} /> Autocompletar
              </button>
              <button className="btn" style={{ background: 'white', opacity: state.past.length === 0 ? 0.5 : 1 }} onClick={() => dispatch({ type: 'UNDO' })} disabled={state.past.length === 0}>
                <Undo2 size={16} /> Deshacer
              </button>
              <button className="btn" style={{ background: 'white', opacity: state.future.length === 0 ? 0.5 : 1 }} onClick={() => dispatch({ type: 'REDO' })} disabled={state.future.length === 0}>
                <Redo2 size={16} /> Rehacer
              </button>
              <button className="btn btn-primary" onClick={exportData}><Download size={16} /> Exportar</button>
              <label className="btn btn-primary" style={{ cursor: 'pointer' }}>
                <Upload size={16} /> Importar
                <input type="file" accept=".json" style={{ display: 'none' }} onChange={importData} />
              </label>

              {/* User badge + logout */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '4px', padding: '6px 12px', background: 'rgba(79,70,229,0.08)', borderRadius: '20px', border: '1px solid rgba(79,70,229,0.2)' }}>
                <ShieldCheck size={15} color="var(--primary)" />
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary)' }}>{user?.displayName}</span>
                <button title="Cerrar sesión" onClick={logout} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: '2px', color: 'var(--text-muted)' }}>
                  <LogOut size={15} />
                </button>
              </div>
            </div>
          </div>

          <Calendar />
        </div>
      </div>
      <DragOverlay>
        {activeDoctor ? (
          <div className="doctor-card" style={{ opacity: 0.85, cursor: 'grabbing', background: 'white', padding: '12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 10px 15px rgba(0,0,0,0.15)' }}>
            <div className="color-dot" style={{ backgroundColor: activeDoctor.color }} />
            <span>{activeDoctor.name}</span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

// ─── Doctor read-only view ───────────────────────────────────────────────────
const DoctorApp = () => {
  const { state, dispatch } = useStore();
  const { user, logout } = useAuth();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'linear-gradient(135deg, #e0eafc 0%, #cfdef3 100%)' }}>
      {/* Top bar */}
      <div style={{ padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(255,255,255,0.5)', boxShadow: '0 2px 8px rgba(31,38,135,0.07)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Stethoscope size={22} color="var(--primary)" />
          <h1 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>Cuadro de Turnos</h1>
          <span style={{ fontSize: '0.72rem', background: '#D1FAE5', color: '#065F46', padding: '3px 8px', borderRadius: '10px', fontWeight: 600 }}>Solo lectura</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Month nav */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button className="btn-icon" onClick={() => dispatch({ type: 'SET_MONTH', payload: subMonths(state.currentMonth, 1) })}>
              <ChevronLeft size={20} />
            </button>
            <span style={{ fontWeight: 600, textTransform: 'capitalize', minWidth: '150px', textAlign: 'center' }}>
              {format(state.currentMonth, 'MMMM yyyy', { locale: es })}
            </span>
            <button className="btn-icon" onClick={() => dispatch({ type: 'SET_MONTH', payload: addMonths(state.currentMonth, 1) })}>
              <ChevronRight size={20} />
            </button>
          </div>

          {/* User badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', background: '#D1FAE5', borderRadius: '20px', border: '1px solid #6EE7B7' }}>
            <User size={14} color="#059669" />
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#065F46' }}>{user?.displayName}</span>
            <button title="Cerrar sesión" onClick={logout} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: '2px', color: '#6B7280' }}>
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Read-only calendar */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', padding: '24px' }}>
        <Calendar readOnly />
      </div>
    </div>
  );
};

// ─── Router ─────────────────────────────────────────────────────────────────
const AppRouter = () => {
  const { user } = useAuth();

  if (!user) return <LoginPage />;
  if (user.role === 'admin') return <AdminApp />;
  return <DoctorApp />;
};

// ─── Root ────────────────────────────────────────────────────────────────────
function App() {
  return (
    <AuthProvider>
      <StoreProvider>
        <AppRouter />
      </StoreProvider>
    </AuthProvider>
  );
}

export default App;
