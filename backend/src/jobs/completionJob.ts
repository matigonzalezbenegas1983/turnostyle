import { getDb } from '../db/database';
import { todayDate, nowTime } from '../utils/timeUtils';

export function startCompletionJob(): void {
  const tick = () => {
    const db = getDb();
    const today = todayDate();
    const now = nowTime();
    const info = db
      .prepare(
        `UPDATE appointments SET status = 'completed'
         WHERE status = 'scheduled'
           AND (date < ? OR (date = ? AND end_time <= ?))`
      )
      .run(today, today, now);
    if (info.changes > 0) {
      console.log(`[completionJob] ${info.changes} turno(s) marcado(s) como completado(s)`);
    }
  };

  tick();
  setInterval(tick, 60_000);
}
