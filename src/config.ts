import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: Number(process.env.PORT ?? 3000),
  databasePath: process.env.DATABASE_URL ?? './questboard.sqlite',
  corsOrigins: [
    process.env.VITE_ORIGIN ?? 'http://localhost:5173',
    process.env.PROD_ORIGIN
  ].filter(Boolean) as string[],
  bcryptRounds: Number(process.env.BCRYPT_ROUNDS ?? 12),
  pinBypassSecret: process.env.PIN_BYPASS_SECRET,
  timezone: process.env.TZ ?? Intl.DateTimeFormat().resolvedOptions().timeZone
};
