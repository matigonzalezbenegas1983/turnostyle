import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/client';
import type { Appointment } from '../types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import LoadingSpinner from '../components/shared/LoadingSpinner';

export default function ConfirmationPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [appt, setAppt] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState('');
  const [cancelled, setCancelled] = useState(false);

  useEffect(() => {
    api.get<Appointment>(`/appointments/${id}`).then(r => {
      setAppt(r.data);
      setLoading(false);
    });
  }, [id]);

  const handleCancel = async () => {
    if (!appt) return;
    const phone = prompt('Ingresá tu teléfono para confirmar la cancelación:');
    if (!phone) return;
    setCancelling(true);
    try {
      await api.patch(`/appointments/${id}/cancel`, { phone: phone.trim() });
      setCancelled(true);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg ?? 'No se pudo cancelar el turno.');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) return <div className="max-w-lg mx-auto px-4 py-16"><LoadingSpinner /></div>;
  if (!appt) return <div className="max-w-lg mx-auto px-4 py-16 text-center text-muted">Turno no encontrado.</div>;

  const dateFormatted = format(new Date(appt.date + 'T12:00:00'), "EEEE d 'de' MMMM yyyy", { locale: es });

  if (cancelled) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="text-5xl mb-4">✕</div>
        <h1 className="text-2xl font-bold text-white mb-2">Turno cancelado</h1>
        <p className="text-muted mb-6">Tu turno fue cancelado correctamente.</p>
        <Link to="/" className="btn-primary">Reservar nuevo turno</Link>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-10">
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-3xl mx-auto mb-4">✓</div>
        <h1 className="text-2xl font-bold text-white">¡Turno confirmado!</h1>
        <p className="text-muted mt-1">Te esperamos con los brazos abiertos</p>
      </div>

      <div className="card space-y-3 mb-6 text-sm">
        <div className="flex justify-between"><span className="text-muted">Servicio</span><span className="text-white font-medium">{appt.serviceName ?? appt.service_name}</span></div>
        <div className="flex justify-between"><span className="text-muted">Estilista</span><span className="text-white font-medium">{appt.barberName}</span></div>
        <div className="flex justify-between"><span className="text-muted">Fecha</span><span className="text-white font-medium capitalize">{dateFormatted}</span></div>
        <div className="flex justify-between"><span className="text-muted">Horario</span><span className="text-white font-medium">{appt.start_time} – {appt.end_time} hs</span></div>
        <div className="flex justify-between"><span className="text-muted">Cliente</span><span className="text-white font-medium">{appt.customer_name}</span></div>
      </div>

      {error && <p className="text-red-400 text-sm bg-red-900/20 border border-red-800/40 rounded-lg px-4 py-2 mb-4">{error}</p>}

      <div className="flex gap-3">
        <button onClick={handleCancel} disabled={cancelling} className="btn-danger flex-1 text-sm">
          {cancelling ? 'Cancelando...' : 'Cancelar turno'}
        </button>
        <button
          onClick={() => navigate(`/mis-turnos?phone=${encodeURIComponent(appt.customer_phone)}&reschedule=${appt.id}`)}
          className="btn-ghost flex-1 text-sm"
        >
          Cambiar turno
        </button>
      </div>

      <div className="mt-4 text-center">
        <Link to="/" className="text-sm text-muted hover:text-white transition-colors">← Reservar otro turno</Link>
      </div>
    </div>
  );
}
