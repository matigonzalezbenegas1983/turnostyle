import bcrypt from 'bcryptjs';
import { getPool } from './database';
import { runSchema } from './schema';

export async function runSeed(): Promise<void> {
  const pool = getPool();

  await runSchema(pool);

  const barberRes = await pool.query('SELECT COUNT(*) AS c FROM barbers');
  if (parseInt(barberRes.rows[0].c, 10) === 0) {
    for (const name of ['Estilista 1', 'Estilista 2', 'Estilista 3', 'Estilista 4', 'Estilista 5']) {
      await pool.query('INSERT INTO barbers (name) VALUES ($1)', [name]);
    }
    console.log('Seeded 5 barbers');
  }

  const adminRes = await pool.query('SELECT COUNT(*) AS c FROM admins');
  if (parseInt(adminRes.rows[0].c, 10) === 0) {
    const hash = await bcrypt.hash('admin123', 10);
    await pool.query(
      'INSERT INTO admins (username, password_hash) VALUES ($1, $2)',
      ['admin', hash]
    );
    console.log('Seeded admin user (admin / admin123) — change the password!');
  }
}

if (require.main === module) {
  runSeed().then(() => {
    console.log('Seed complete.');
    process.exit(0);
  }).catch(err => {
    console.error(err);
    process.exit(1);
  });
}
