// Admin password configuration
// This will use environment variables in both development and production
const envPassword = import.meta.env.VITE_ADMIN_PASSWORD;

if (!envPassword) {
  console.error('VITE_ADMIN_PASSWORD environment variable is not set!');
}

export const ADMIN_PASSWORD = envPassword || 'MISSING_PASSWORD';