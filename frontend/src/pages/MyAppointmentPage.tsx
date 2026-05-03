import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import type { Appointment, Service, Barber } from '../types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import SlotGrid from '../components/booking/SlotGrid';
import { BookingProvider, useBooking } from '../context/BookingContext';

function statusBadge(status: string) {
  if (status === 'scheduled') return <span className="badge-scheduled">Programado</span>;
  if (status === 'completed') return <span className="badge-completed">Completado</span>;
  return <span className="badge-cancelled">Cancelado</span>;
}

function RescheduleWizard({ appt, phone, onDone }: { appt: Appointment; phone: string; onDone: () => void }) {
  const { state, setService, setBarber, setDate } = useBooking();
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.get<Service[]>('/services'), api.get<Barber[]>('/barbers')]).then(([s, b]) => {
      setServices(s.data);
      setBarbers(b.data);
    });
  }, []);

  const handleConfirm = async () => {
    if (!state.service || !state.barber || !state.date || !state.slot) { setError('Completá todos los campos'); return; }
    setLoading(true);
    setError('');
    try {
      await api.patch(`/appointments/${appt.id}/reschedule`, {
        phone,
        barberId: state.barber.id,
        serviceId: state.service.id,
        date: state.date,
        startTime: state.slot.start,
      });
      onDone();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg ?? 'Error al reprogramar. Intentá de nuevo.');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="section-label">Nuevo servicio</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {services.map(s => (
            <button key={s.id} onClick={() => setService(s)}
              className={`card text-left text-sm cursor-pointer transition-all hover:border-primary/60
                ${state.service?.id === s.id ? 'border-primary bg-primary/10' : ''}`}>
              <p className="font-medium text-white">{s.name}</p>
              <p className="text-muted">{s.duration_min} min</p>
            </button>
          ))}
        </div>
      </div>

      {state.service && (
        <div>
          <h3 className="section-label">Nuevo estilista</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {barbers.map(b => (
              <button key={b.id} onClick={() => setBarber(b)}
                className={`card text-center text-sm cursor-pointer transition-all hover:border-primary/60
                  ${state.barber?.id === b.id ? 'border-primary bg-primary/10' : ''}`}>
                <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center font-bold text-primary mx-auto mb-1">
                  {b.name.charAt(0)}
                </div>
                <p className="text-white font-medium">{b.name}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {state.barber && state.service && (
        <div>
          <h3 className="section-label">Nueva fecha</h3>
          <input
            type="date"
            className="input mb-4"
            min={new Date().toISOString().slice(0, 10)}
            value={state.date}
            onChange={e => setDate(e.target.value)}
          />
          {state.date && (
            <>
              <h3 className="section-label">Nuevo horario</h3>
              <SlotGrid />
            </>
          )}
        </div>
      )}

      {error && <p className="text-red-400 text-sm bg-red-900/20 border border-red-800/40 rounded-lg px-4 py-2">{error}</p>}

      {state.slot && (
        <button onClick={handleConfirm} disabled={loading} className="btn-primary w-full">
          {loading ? 'Guardando...' : 'Confirmar cambio'}
        </button>
      )}
    </div>
  );
}

export default function MyAppointmentPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [phone, setPhone] = useState(searchParams.get('phone') ?? '');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');
  const [reschedulingId, setReschedulingId] = useState<number | null>(
    searchParams.get('reschedule') ? Number(searchParams.get('reschedule')) : null
  );
  const [successMsg, setSuccessMsg] = useState('');

  const lookup = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!phone.trim()) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post<Appointment[]>('/appointments/lookup', { phone: phone.trim() });
      setAppointments(data);
      setSearched(true);
      if (searchParams.get('phone')) {
        setReschedulingId(searchParams.get('reschedule') ? Number(searchParams.get('reschedule')) : null);
      }
    } catch {
      setError('Error al buscar el turno. Verificá el número.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (searchParams.get('phone')) lookup();
  }, []);

  const handleCancel = async (id: number) => {
    if (!confirm('¿Querés cancelar este turno?')) return;
    try {
      await api.patch(`/appointments/${id}/cancel`, { phone: phone.trim() });
      setSuccessMsg('Turno cancelado correctamente.');
      setAppointments(prev => prev.filter(a => a.id !== id));
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg ?? 'No se pudo cancelar.');
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-extrabold text-white mb-2 tracking-tight">Mis Turnos</h1>
      <p className="text-muted mb-8">Ingresá tu teléfono para ver y gestionar tus turnos.</p>

      <form onSubmit={lookup} className="flex gap-3 mb-8">
        <input
          className="input flex-1"
          placeholder="Tu número de teléfono"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          inputMode="numeric"
        />
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? '...' : 'Buscar'}
        </button>
      </form>

      {successMsg && (
        <div className="bg-primary/10 border border-primary/30 rounded-lg px-4 py-3 text-primary text-sm mb-6">{successMsg}</div>
      )}
      {error && (
        <div className="bg-red-900/20 border border-red-800/40 rounded-lg px-4 py-3 text-red-400 text-sm mb-6">{error}</div>
      )}

      {searched && appointments.length === 0 && !successMsg && (
        <div className="text-center py-12 text-muted">
          <p className="text-3xl mb-3">📋</p>
          <p>No encontramos turnos activos para este teléfono.</p>
        </div>
      )}

      {appointments.map(appt => {
        const dateFormatted = format(new Date(appt.date + 'T12:00:00'), "EEEE d 'de' MMMM", { locale: es });
        const isRescheduling = reschedulingId === appt.id;

        return (
          <div key={appt.id} className="card mb-4 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-white">{appt.serviceName ?? appt.service_name}</p>
                <p className="text-sm text-muted capitalize">{dateFormatted} · {appt.start_time} – {appt.end_time} hs</p>
                <p className="text-sm text-muted">Estilista: {appt.barberName}</p>
              </div>
              {statusBadge(appt.status)}
            </div>

            {appt.status === 'scheduled' && !isRescheduling && (
              <div className="flex gap-3">
                <button onClick={() => handleCancel(appt.id)} className="btn-danger text-sm flex-1">Cancelar</button>
                <button onClick={() => setReschedulingId(appt.id)} className="btn-ghost text-sm flex-1">Cambiar turno</button>
              </div>
            )}

            {isRescheduling && (
              <div className="border-t border-border pt-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-white">Reprogramar turno</h3>
                  <button onClick={() => setReschedulingId(null)} className="text-muted hover:text-white text-sm">✕ Cancelar</button>
                </div>
                <BookingProvider>
                  <RescheduleWizard
                    appt={appt}
                    phone={phone}
                    onDone={() => {
                      setReschedulingId(null);
                      setSuccessMsg('Turno reprogramado correctamente.');
                      lookup();
                      navigate('/mis-turnos');
                    }}
                  />
                </BookingProvider>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
