import bcrypt from 'bcrypt';
import { getDb } from './database';

export function runSeed(): void {
  const db = getDb();

  const barberCount = (db.prepare('SELECT COUNT(*) as c FROM barbers').get() as { c: number }).c;
  if (barberCount === 0) {
    const insert = db.prepare('INSERT INTO barbers (name) VALUES (?)');
    ['Estilista 1', 'Estilista 2', 'Estilista 3', 'Estilista 4', 'Estilista 5'].forEach(
      name => insert.run(name)
    );
    console.log('Seeded 5 barbers');
  }

  const adminCount = (db.prepare('SELECT COUNT(*) as c FROM admins').get() as { c: number }).c;
  if (adminCount === 0) {
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare('INSERT INTO admins (username, password_hash) VALUES (?, ?)').run('admin', hash);
    console.log('Seeded admin user (admin / admin123) — change the password!');
  }
}

if (require.main === module) {
  runSeed();
  console.log('Seed complete.');
}
