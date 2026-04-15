/**
 * Admin seed script
 *
 * Run ONCE after setting up Neon to create your first admin account:
 *   npm run seed:admin
 *
 * Set these in your .env before running:
 *   ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD
 */

import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';

dotenv.config();

import { User, UserRole } from '../entities/user.entity';

const dataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  entities: [User],
  synchronize: false,
});

async function seedAdmin() {
  const name = process.env.ADMIN_NAME;
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!name || !email || !password) {
    console.error(
      '❌  Missing env vars. Set ADMIN_NAME, ADMIN_EMAIL, and ADMIN_PASSWORD in .env',
    );
    process.exit(1);
  }

  await dataSource.initialize();
  const userRepo = dataSource.getRepository(User);

  const existing = await userRepo.findOne({ where: { email } });
  if (existing) {
    console.log(`⚠️  Admin with email "${email}" already exists — skipping.`);
    await dataSource.destroy();
    return;
  }

  const admin = userRepo.create({
    name,
    email,
    password: await bcrypt.hash(password, 10),
    role: UserRole.ADMIN,
    isActive: true,
  });

  await userRepo.save(admin);
  console.log(`✅  Admin account created: ${email}`);
  await dataSource.destroy();
}

seedAdmin().catch((err) => {
  console.error('❌  Seed failed:', err);
  process.exit(1);
});