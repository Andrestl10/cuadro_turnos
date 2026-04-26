import React, { useState } from 'react';
import { StoreProvider, useStore } from './store/StoreContext';
import { Sidebar } from './components/Sidebar';
import { Calendar } from './components/Calendar';
import { DndContext, DragOverlay, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { addMonths, subMonths, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Undo2, Redo2, Download, Upload, ChevronLeft, ChevronRight, Wand2 } from 'lucide-react';
import { generateSchedule } from './utils/autoSchedule';
import './index.css';

const AppContent = () => {
  const { state, dispatch } = useStore();
  const [activeDoctor, setActiveDoctor] = useState<any>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const handleDragStart = (event: any) => {
    setActiveDoctor(event.active.data.current.doctor);
  };

  const handleDragEnd = (event: any) => {
    const { over, active } = event;
    setActiveDoctor(null);

    if (over && active.data.current.doctor) {
      const { dateStr, type } = over.data.current;
      const doctorId = active.data.current.doctor.id;

      const alreadyAssigned = state.shifts.find(s => s.dateStr === dateStr && s.type === type && s.doctorId === doctorId);
      if (!alreadyAssigned) {
        dispatch({
          type: 'ADD_SHIFT',
          payload: { dateStr, type, doctorId }
        });
      }
    }
  };

  const exportData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ doctors: state.doctors, shifts: state.shifts }));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href",     dataStr);
    downloadAnchorNode.setAttribute("download", "turnos_export.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (parsed.doctors && parsed.shifts) {
            alert("Para importar datos, esta característica se habilitará en la próxima actualización de estado.");
            // En una versión completa, enviaríamos una acción 'SET_STATE' al reducer.
          }
        } catch (err) {
          alert("Error importando archivo.");
        }
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
    <DndContext 
      sensors={sensors}
      onDragStart={handleDragStart} 
      onDragEnd={handleDragEnd}
    >
      <div className="app-container">
        <Sidebar />
        <div className="main-content">
          <div className="header glass" style={{ padding: '16px 24px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button className="btn-icon" onClick={() => dispatch({ type: 'SET_MONTH', payload: subMonths(state.currentMonth, 1) })}>
                <ChevronLeft />
              </button>
              <h1 style={{ margin: 0, fontSize: '1.5rem', textTransform: 'capitalize' }}>
                {format(state.currentMonth, 'MMMM yyyy', { locale: es })}
              </h1>
              <button className="btn-icon" onClick={() => dispatch({ type: 'SET_MONTH', payload: addMonths(state.currentMonth, 1) })}>
                <ChevronRight />
              </button>
            </div>
            
            <div style={{ display: 'flex', gap: '12px' }}>
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
            </div>
          </div>
          
          <Calendar />
        </div>
      </div>
      <DragOverlay>
        {activeDoctor ? (
          <div className="doctor-card" style={{ opacity: 0.8, cursor: 'grabbing', background: 'white', padding: '12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 10px 15px rgba(0,0,0,0.1)' }}>
            <div className="color-dot" style={{ backgroundColor: activeDoctor.color, width: '12px', height: '12px', borderRadius: '50%' }}></div>
            <span>{activeDoctor.name}</span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

function App() {
  return (
    <StoreProvider>
      <AppContent />
    </StoreProvider>
  );
}

export default App;
