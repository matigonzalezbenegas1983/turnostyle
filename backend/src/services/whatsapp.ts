import https from 'https';
import { URL, URLSearchParams } from 'url';

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

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Normaliza un número local de Argentina al formato WhatsApp.
 * Los celulares argentinos necesitan el prefijo 9 para WhatsApp:
 * "3518613656"   → "whatsapp:+5493518613656"
 * "03518613656"  → "whatsapp:+5493518613656"
 * "+543518613656"→ "whatsapp:+5493518613656"  (agrega 9 si falta)
 * "+5493518613656"→"whatsapp:+5493518613656"  (ya correcto)
 */
function toWA(phone: string): string {
  const trimmed = phone.trim().replace(/\s/g, '');

  // Si ya viene con prefijo +
  if (trimmed.startsWith('+')) {
    let digits = trimmed.slice(1).replace(/[^\d]/g, '');
    // +54 sin 9 → agregar 9 (ej: +543518... → +5493518...)
    if (digits.startsWith('54') && !digits.startsWith('549')) {
      digits = '549' + digits.slice(2);
    }
    return `whatsapp:+${digits}`;
  }

  // Sin prefijo: solo dígitos
  let digits = trimmed.replace(/[^\d]/g, '');
  // quitar 0 inicial (formato local AR: 0351...)
  if (digits.startsWith('0')) digits = digits.slice(1);
  // si ya tiene código de país 54
  if (digits.startsWith('54')) {
    if (!digits.startsWith('549')) digits = '549' + digits.slice(2);
    return `whatsapp:+${digits}`;
  }
  // número local sin código de país → +549
  return `whatsapp:+549${digits}`;
}

/** "2026-05-15" → "15/05/2026" */
function fmtDate(d: string): string {
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

/**
 * Llama a la Twilio Messages API usando el módulo https nativo de Node.js.
 * No depende de ningún paquete npm externo.
 */
async function send(to: string, body: string): Promise<void> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID!;
  const authToken  = process.env.TWILIO_AUTH_TOKEN!;
  const from       = process.env.TWILIO_WHATSAPP_FROM!;

  const payload = new URLSearchParams({ From: from, To: to, Body: body }).toString();
  const auth    = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
  const apiUrl  = new URL(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`);

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: apiUrl.hostname,
        path:     apiUrl.pathname,
        method:   'POST',
        headers:  {
          'Content-Type':   'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(payload),
          'Authorization':  `Basic ${auth}`,
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const json = JSON.parse(data) as { sid?: string };
              console.log(`[WhatsApp] ✅ Enviado a ${to} — SID: ${json.sid ?? 'n/a'}`);
            } catch {
              console.log(`[WhatsApp] ✅ Enviado a ${to}`);
            }
            resolve();
          } else {
            reject(new Error(`Twilio HTTP ${res.statusCode}: ${data}`));
          }
        });
      }
    );
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
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
