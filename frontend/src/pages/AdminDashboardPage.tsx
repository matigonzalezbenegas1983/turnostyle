import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, addDays, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import api from '../api/client';
import type { AdminSchedule, Service } from '../types';
import { useAuth } from '../context/AuthContext';
import DayTimeline from '../components/admin/DayTimeline';
import LoadingSpinner from '../components/shared/LoadingSpinner';

const OPEN_HOUR = 9;
const CLOSE_HOUR = 20;
const hours = Array.from({ length: CLOSE_HOUR - OPEN_HOUR + 1 }, (_, i) => OPEN_HOUR + i);
const PX_PER_MIN = 1.5;

export default function AdminDashboardPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [schedule, setSchedule] = useState<AdminSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [tab, setTab] = useState<'schedule' | 'services'>('schedule');
  const [services, setServices] = useState<Service[]>([]);
  const [newSvc, setNewSvc] = useState({ name: '', duration_min: '', price_cents: '' });
  const [svcError, setSvcError] = useState('');

  const loadSchedule = useCallback(async () => {
    try {
      const { data } = await api.get<AdminSchedule>('/admin/appointments', { params: { date } });
      setSchedule(data);
      setLastUpdated(new Date());
    } finally {
      setLoading(false);
    }
  }, [date]);

  const loadServices = () => {
    api.get<Service[]>('/services').then(r => setServices(r.data));
  };

  useEffect(() => {
    setLoading(true);
    loadSchedule();
  }, [loadSchedule]);

  useEffect(() => {
    const interval = setInterval(loadSchedule, 60_000);
    return () => clearInterval(interval);
  }, [loadSchedule]);

  useEffect(() => {
    if (tab === 'services') loadServices();
  }, [tab]);

  const handleLogout = () => { logout(); navigate('/admin/login'); };

  const handleCreateService = async () => {
    if (!newSvc.name || !newSvc.duration_min) { setSvcError('Nombre y duración son requeridos'); return; }
    setSvcError('');
    try {
      await api.post('/services', {
        name: newSvc.name,
        duration_min: Number(newSvc.duration_min),
        price_cents: Number(newSvc.price_cents) * 100 || 0,
      });
      setNewSvc({ name: '', duration_min: '', price_cents: '' });
      loadServices();
    } catch {
      setSvcError('Error al crear el servicio.');
    }
  };

  const handleDeleteService = async (id: number) => {
    if (!confirm('¿Eliminar este servicio?')) return;
    try {
      await api.delete(`/services/${id}`);
      loadServices();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      alert(msg ?? 'Error al eliminar el servicio.');
    }
  };

  const dateLabel = format(new Date(date + 'T12:00:00'), "EEEE d 'de' MMMM yyyy", { locale: es });

  return (
    <div className="min-h-screen">
      <div className="border-b border-border bg-surface/50">
        <div className="max-w-full px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              <button
                onClick={() => setTab('schedule')}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors
                  ${tab === 'schedule' ? 'bg-primary text-white' : 'text-muted hover:text-white'}`}
              >
                Agenda
              </button>
              <button
                onClick={() => setTab('services')}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors
                  ${tab === 'services' ? 'bg-primary text-white' : 'text-muted hover:text-white'}`}
              >
                Servicios
              </button>
            </div>
          </div>

          {tab === 'schedule' && (
            <div className="flex items-center gap-2">
              <button onClick={() => setDate(format(subDays(new Date(date + 'T12:00:00'), 1), 'yyyy-MM-dd'))} className="btn-ghost py-1 px-3 text-sm">←</button>
              <span className="text-sm text-white capitalize hidden sm:block">{dateLabel}</span>
              <input
                type="date"
                className="input py-1 text-sm w-auto sm:hidden"
                value={date}
                onChange={e => setDate(e.target.value)}
              />
              <button onClick={() => setDate(format(addDays(new Date(date + 'T12:00:00'), 1), 'yyyy-MM-dd'))} className="btn-ghost py-1 px-3 text-sm">→</button>
              <button onClick={() => setDate(new Date().toISOString().slice(0, 10))} className="text-xs text-muted hover:text-white transition-colors px-2">Hoy</button>
            </div>
          )}

          <div className="flex items-center gap-3">
            {lastUpdated && (
              <span className="text-xs text-muted hidden sm:block">
                Actualizado {format(lastUpdated, 'HH:mm:ss')}
              </span>
            )}
            <button onClick={handleLogout} className="btn-ghost py-1 px-3 text-sm">Salir</button>
          </div>
        </div>
      </div>

      {tab === 'schedule' && (
        loading ? (
          <div className="py-20"><LoadingSpinner /></div>
        ) : schedule ? (
          <div className="flex overflow-x-auto">
            <div className="sticky left-0 z-20 bg-bg/90 border-r border-border w-12 shrink-0">
              <div className="h-[72px]" />
              <div className="relative" style={{ height: (CLOSE_HOUR - OPEN_HOUR) * 60 * PX_PER_MIN }}>
                {hours.map(h => (
                  <div
                    key={h}
                    className="absolute right-2 text-[10px] text-muted"
                    style={{ top: (h - OPEN_HOUR) * 60 * PX_PER_MIN - 6 }}
                  >
                    {h}:00
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-1 divide-x divide-border min-w-0">
              {schedule.barbers.map(barber => (
                <DayTimeline key={barber.id} barber={barber} onUpdate={loadSchedule} />
              ))}
            </div>
          </div>
        ) : null
      )}

      {tab === 'services' && (
        <div className="max-w-2xl mx-auto px-4 py-8">
          <h2 className="text-xl font-bold text-white mb-6">Gestión de Servicios</h2>

          <div className="card mb-6 space-y-4">
            <h3 className="font-semibold text-white">Nuevo servicio</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input className="input" placeholder="Nombre" value={newSvc.name} onChange={e => setNewSvc(s => ({ ...s, name: e.target.value }))} />
              <input className="input" placeholder="Duración (min)" type="number" value={newSvc.duration_min} onChange={e => setNewSvc(s => ({ ...s, duration_min: e.target.value }))} />
              <input className="input" placeholder="Precio ($)" type="number" value={newSvc.price_cents} onChange={e => setNewSvc(s => ({ ...s, price_cents: e.target.value }))} />
            </div>
            {svcError && <p className="text-red-400 text-sm">{svcError}</p>}
            <button onClick={handleCreateService} className="btn-primary">Agregar servicio</button>
          </div>

          <div className="space-y-3">
            {services.length === 0 && <p className="text-muted text-center py-8">No hay servicios cargados aún.</p>}
            {services.map(svc => (
              <div key={svc.id} className="card flex items-center justify-between">
                <div>
                  <p className="font-medium text-white">{svc.name}</p>
                  <p className="text-sm text-muted">{svc.duration_min} min · {svc.price_cents > 0 ? `$${(svc.price_cents / 100).toFixed(0)}` : 'Sin precio'}</p>
                </div>
                <button onClick={() => handleDeleteService(svc.id)} className="btn-danger text-sm py-1.5 px-3">Eliminar</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
