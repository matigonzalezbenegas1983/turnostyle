import { getPool } from '../db/database';
import { todayDate, nowTime } from '../utils/timeUtils';

export function startCompletionJob(): void {
  const tick = async () => {
    const pool = getPool();
    const today = todayDate();
    const now = nowTime();
    const result = await pool.query(
      `UPDATE appointments SET status = 'completed'
       WHERE status = 'scheduled'
         AND (date < $1 OR (date = $1 AND end_time <= $2))`,
      [today, now]
    );
    if ((result.rowCount ?? 0) > 0) {
      console.log(`[completionJob] ${result.rowCount} turno(s) marcado(s) como completado(s)`);
    }
  };

  tick().catch(console.error);
  setInterval(() => tick().catch(console.error), 60_000);
}
