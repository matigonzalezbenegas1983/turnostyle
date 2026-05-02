import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { useBooking } from '../../context/BookingContext';
import type { Appointment } from '../../types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function CustomerForm() {
  const { state, setCustomer, setStep, reset } = useBooking();
  const [name, setName] = useState(state.customerName);
  const [phone, setPhone] = useState(state.customerPhone);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) { setError('Completá tu nombre y teléfono'); return; }
    if (!/^\d{7,}$/.test(phone.replace(/\s/g, ''))) { setError('Ingresá un teléfono válido (solo números)'); return; }

    setCustomer(name, phone);
    setLoading(true);
    setError('');

    try {
      const { data } = await api.post<Appointment>('/appointments', {
        barberId: state.barber!.id,
        serviceId: state.service!.id,
        customerName: name.trim(),
        customerPhone: phone.trim(),
        date: state.date,
        startTime: state.slot!.start,
      });
      reset();
      navigate(`/confirmacion/${data.id}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg ?? 'Error al reservar el turno. Intentá de nuevo.');
      setLoading(false);
    }
  };

  const dateFormatted = state.date
    ? format(new Date(state.date + 'T12:00:00'), "EEEE d 'de' MMMM", { locale: es })
    : '';

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="card bg-bg/50 border-primary/20 space-y-2 text-sm">
        <div className="flex justify-between"><span className="text-muted">Servicio</span><span className="text-white font-medium">{state.service?.name}</span></div>
        <div className="flex justify-between"><span className="text-muted">Estilista</span><span className="text-white font-medium">{state.barber?.name}</span></div>
        <div className="flex justify-between"><span className="text-muted">Fecha</span><span className="text-white font-medium capitalize">{dateFormatted}</span></div>
        <div className="flex justify-between"><span className="text-muted">Horario</span><span className="text-white font-medium">{state.slot?.start} – {state.slot?.end} hs</span></div>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-sm text-muted mb-1">Nombre completo</label>
          <input className="input" placeholder="Tu nombre" value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm text-muted mb-1">Teléfono</label>
          <input className="input" placeholder="Ej: 1122334455" value={phone} onChange={e => setPhone(e.target.value)} inputMode="numeric" />
        </div>
      </div>

      {error && <p className="text-red-400 text-sm bg-red-900/20 border border-red-800/40 rounded-lg px-4 py-2">{error}</p>}

      <div className="flex gap-3">
        <button type="button" onClick={() => setStep(3)} className="btn-ghost">← Volver</button>
        <button type="submit" disabled={loading} className="btn-primary flex-1">
          {loading ? 'Reservando...' : 'Confirmar turno'}
        </button>
      </div>
    </form>
  );
}
