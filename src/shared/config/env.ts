const requireEnv = (value: string | undefined, name: string) => {
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
};

export const ENV = {
  SUPABASE_URL: requireEnv(import.meta.env.VITE_SUPABASE_URL, 'VITE_SUPABASE_URL'),
  SUPABASE_PUBLISHABLE_KEY: requireEnv(
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY,
    'VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY',
  ),
};
