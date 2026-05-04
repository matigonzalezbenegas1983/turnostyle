import twilio from 'twilio';

// ── Tipos ──────────────────────────────────────────────────────────────────

export interface ApptInfo {
  id: number;
  customer_name: string;
  customer_phone: string;
  date: string;       // YYYY-MM-DD
  start_time: string; // HH:MM
  end_time: string;   // HH:MM
  service_name?: string;
  barber_name?: string;
}

// ── Configuración ──────────────────────────────────────────────────────────

function isEnabled(): boolean {
  return !!(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_WHATSAPP_FROM
  );
}

let _client: ReturnType<typeof twilio> | null = null;
function getClient(): ReturnType<typeof twilio> {
  if (!_client) {
    _client = twilio(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_AUTH_TOKEN!
    );
  }
  return _client;
}

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Normaliza un número local de Argentina al formato WhatsApp.
 * "1122334455"  → "whatsapp:+541122334455"
 * "0111234567"  → "whatsapp:+54111234567"
 * "+54911..."   → "whatsapp:+54911..."
 */
function toWA(phone: string): string {
  let digits = phone.replace(/[^\d]/g, ''); // solo números
  if (phone.trim().startsWith('+')) digits = phone.trim().replace(/[^\d+]/g, '');

  if (phone.trim().startsWith('+')) {
    return `whatsapp:${phone.trim().replace(/\s/g, '')}`;
  }
  // quitar 0 inicial (formato local AR: 011-xxxx-xxxx)
  if (digits.startsWith('0')) digits = digits.slice(1);
  // si ya tiene código de país 54
  if (digits.startsWith('54') && digits.length >= 12) {
    return `whatsapp:+${digits}`;
  }
  return `whatsapp:+54${digits}`;
}

/** "2026-05-15" → "15/05/2026" */
function fmtDate(d: string): string {
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

/** Envía un mensaje y loguea el resultado (fire-and-forget seguro) */
async function send(to: string, body: string): Promise<void> {
  const from = process.env.TWILIO_WHATSAPP_FROM!;
  const msg = await getClient().messages.create({ from, to, body });
  console.log(`[WhatsApp] ✅ Enviado a ${to} — SID: ${msg.sid}`);
}

/** Wrapper que nunca lanza (fire-and-forget) */
async function safeSend(phone: string, body: string): Promise<void> {
  if (!isEnabled()) return;
  try {
    await send(toWA(phone), body);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[WhatsApp] ❌ Error enviando a ${phone}: ${msg}`);
  }
}

// ── API pública ────────────────────────────────────────────────────────────

/** Confirmación inmediata al reservar el turno */
export async function sendConfirmation(appt: ApptInfo): Promise<void> {
  const service = appt.service_name ?? 'tu servicio';
  const barber  = appt.barber_name  ?? 'tu estilista';
  const body =
    `✅ *¡Turno reservado!*\n\n` +
    `Hola ${appt.customer_name} 👋\n` +
    `Tu turno de *${service}* con *${barber}* está confirmado:\n\n` +
    `📅 Fecha: ${fmtDate(appt.date)}\n` +
    `🕐 Hora: ${appt.start_time} hs\n\n` +
    `Si necesitás cancelarlo, podés hacerlo desde la app con tu número de teléfono.\n\n` +
    `_¡Te esperamos!_ ✂️`;
  await safeSend(appt.customer_phone, body);
}

/** Recordatorio antes del turno (30 o 15 minutos) */
export async function sendReminder(appt: ApptInfo, minutesBefore: 30 | 15): Promise<void> {
  const service = appt.service_name ?? 'tu servicio';
  const body =
    `⏰ *Recordatorio de turno*\n\n` +
    `Hola ${appt.customer_name}!\n` +
    `Tu turno de *${service}* empieza en *${minutesBefore} minutos* (${appt.start_time} hs).\n\n` +
    `¡Te esperamos! ✂️`;
  await safeSend(appt.customer_phone, body);
}

/** Aviso de cancelación de un turno (por el cliente o por el admin) */
export async function sendCancellation(appt: ApptInfo): Promise<void> {
  const service = appt.service_name ?? 'tu servicio';
  const body =
    `❌ *Turno cancelado*\n\n` +
    `Hola ${appt.customer_name},\n` +
    `Tu turno de *${service}* del ${fmtDate(appt.date)} a las ${appt.start_time} hs fue *cancelado*.\n\n` +
    `Podés reservar un nuevo turno desde la app cuando quieras. 📱`;
  await safeSend(appt.customer_phone, body);
}

/**
 * Aviso masivo de cierre por el día de hoy.
 * Se envía a todos los turnos agendados para hoy.
 */
export async function sendClosedBroadcast(appts: ApptInfo[]): Promise<number> {
  if (!isEnabled()) {
    console.warn('[WhatsApp] Broadcast de cierre omitido: Twilio no configurado.');
    return 0;
  }
  let sent = 0;
  for (const appt of appts) {
    const body =
      `🔒 *Aviso importante*\n\n` +
      `Hola ${appt.customer_name},\n` +
      `Lamentablemente la barbería *no abrirá hoy* (${fmtDate(appt.date)}).\n\n` +
      `Tu turno de las ${appt.start_time} hs quedó *cancelado*. Disculpá las molestias 🙏\n\n` +
      `Podés reservar un nuevo turno desde la app. ✂️`;
    try {
      await send(toWA(appt.customer_phone), body);
      sent++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[WhatsApp] ❌ Error en broadcast a ${appt.customer_phone}: ${msg}`);
    }
  }
  return sent;
}
