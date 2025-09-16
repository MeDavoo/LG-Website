// Admin password is loaded from environment variables
// Set VITE_ADMIN_PASSWORD in your environment or .env.local file
export const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || "defaultpassword";