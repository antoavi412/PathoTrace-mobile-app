import { Pool } from 'pg';
import { pool } from '../src/db/client';

async function main(): Promise<void> {
  await pool.query(`
    INSERT INTO farms (id, name, location, phone)
    VALUES ('11111111-1111-1111-1111-111111111111', 'Demo Farm', 'Punjab, India', '+91 98765 43210')
    ON CONFLICT DO NOTHING;
  `);

  const farmerId = await pool.query<{ id: string }>(
    `INSERT INTO users (farm_id, email, phone, password_hash, name, role)
     VALUES ($1, 'farmer@demo.local', '+91 98765 43210', 'scrypt$', 'Demo Farmer', 'farmer')
     ON CONFLICT (email) DO UPDATE SET id = users.id
     RETURNING id`,
    ['11111111-1111-1111-1111-111111111111']
  );
  const vetId = await pool.query<{ id: string }>(
    `INSERT INTO users (farm_id, email, phone, password_hash, name, role)
     VALUES ($1, 'vet@demo.local', '+91 98765 43211', 'scrypt$', 'Demo Vet', 'veterinarian')
     ON CONFLICT (email) DO UPDATE SET id = users.id
     RETURNING id`,
    ['11111111-1111-1111-1111-111111111111']
  );

  const cows = [
    { tagId: 'TN-001', name: 'Lakshmi', breed: 'Gir', ageMonths: 36 },
    { tagId: 'TN-002', name: 'Ganga', breed: 'Sahiwal', ageMonths: 48 },
    { tagId: 'TN-003', name: 'Kaveri', breed: 'Red Sindhi', ageMonths: 30 },
  ];

  for (const cow of cows) {
    await pool.query(
      `INSERT INTO cattle (farm_id, tag_id, name, breed, age_months, status)
       VALUES ($1, $2, $3, $4, $5, 'active')
       ON CONFLICT (farm_id, tag_id) DO NOTHING`,
      [farmerId.rows[0].id, cow.tagId, cow.name, cow.breed, cow.ageMonths]
    );
  }

  const serials = ['DEV-001', 'DEV-002', 'DEV-003'];
  for (const serial of serials) {
    await pool.query(
      `INSERT INTO devices (farm_id, serial_number, type, model, status, expected_interval_seconds, token_hash)
       VALUES ($1, $2, 'collar', 'PathoTag-C1', 'offline', 900, 'placeholder')
       ON CONFLICT (serial_number) DO NOTHING`,
      [farmerId.rows[0].id, serial]
    );
  }

  console.log('Seed complete.');
  console.log('Farm ID: 11111111-1111-1111-1111-111111111111');
  console.log('Demo users: farmer@demo.local / vet@demo.local');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
