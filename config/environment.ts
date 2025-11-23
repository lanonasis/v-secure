/**
 * Environment configuration for the security service
 */

export const config = {
  JWT_SECRET=REDACTED_JWT_SECRET
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3000', 10),
  SUPABASE_URL=https://<project-ref>.supabase.co
  SUPABASE_KEY: process.env.SUPABASE_KEY || '',
  DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<db>
};
