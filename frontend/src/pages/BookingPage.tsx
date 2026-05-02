import { BookingProvider, useBooking } from '../context/BookingContext';
import ServiceSelector from '../components/booking/ServiceSelector';
import BarberSelector from '../components/booking/BarberSelector';
import DatePicker from '../components/booking/DatePicker';
import SlotGrid from '../components/booking/SlotGrid';
import CustomerForm from '../components/booking/CustomerForm';

const STEPS = ['Servicio', 'Estilista', 'Fecha y hora', 'Tus datos'];

function StepIndicator() {
  const { state } = useBooking();
  return (
    <div className="flex items-center gap-2 mb-8">
      {STEPS.map((label, i) => {
        const n = (i + 1) as 1 | 2 | 3 | 4;
        const active = state.step === n;
        const done = state.step > n;
        return (
          <div key={n} className="flex items-center gap-2">
            <div className={`flex items-center gap-2 text-sm font-medium transition-colors
              ${active ? 'text-white' : done ? 'text-primary' : 'text-muted'}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border
                ${active ? 'bg-primary border-primary text-white' : done ? 'bg-primary/20 border-primary text-primary' : 'border-border text-muted'}`}>
                {done ? '✓' : n}
              </span>
              <span className="hidden sm:inline">{label}</span>
            </div>
            {i < STEPS.length - 1 && <div className={`h-px w-6 sm:w-12 ${done ? 'bg-primary' : 'bg-border'}`} />}
          </div>
        );
      })}
    </div>
  );
}

function BookingWizard() {
  const { state } = useBooking();

  const titles: Record<number, string> = {
    1: '¿Qué servicio necesitás?',
    2: '¿Con qué estilista?',
    3: 'Elegí fecha y horario',
    4: 'Completá tus datos',
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <StepIndicator />
      <h1 className="text-2xl font-bold text-white mb-6">{titles[state.step]}</h1>

      {state.step === 1 && <ServiceSelector />}
      {state.step === 2 && <BarberSelector />}
      {state.step === 3 && (
        <div className="space-y-6">
          <DatePicker />
          {state.date && (
            <div>
              <h2 className="text-lg font-semibold text-white mb-3">Horarios disponibles</h2>
              <SlotGrid />
            </div>
          )}
        </div>
      )}
      {state.step === 4 && <CustomerForm />}
    </div>
  );
}

export default function BookingPage() {
  return (
    <BookingProvider>
      <BookingWizard />
    </BookingProvider>
  );
}
