import { NestFactory } from '@nestjs/core';
import { Model } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { AppModule } from '../app.module';
import { User } from '../schemas/user.schema';

/**
 * Promote an existing user to ROLE_ADMIN so the ingestion admin console is usable.
 *
 *   npx ts-node src/scripts/promote-admin.ts <email>
 *
 * ROLE_ADMIN already exists in the user role enum but was never assigned to
 * anyone. This is intentionally a manual, explicit operation — we never create
 * or auto-promote admins from untrusted input.
 */
async function run() {
  const email = process.argv[2];
  if (!email) {
    // eslint-disable-next-line no-console
    console.error('Usage: ts-node src/scripts/promote-admin.ts <email>');
    process.exit(1);
  }

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  try {
    const userModel = app.get<Model<User>>(getModelToken(User.name));
    const user = await userModel.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      // eslint-disable-next-line no-console
      console.error(`No user found with email ${email}`);
      process.exit(2);
    }
    const previous = (user as any).role;
    (user as any).role = 'ROLE_ADMIN';
    await user.save();
    // eslint-disable-next-line no-console
    console.log(`Promoted ${email}: ${previous} -> ROLE_ADMIN`);
  } finally {
    await app.close();
  }
  process.exit(0);
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('promote-admin failed:', err);
  process.exit(1);
});
