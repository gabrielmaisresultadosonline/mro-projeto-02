import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { getAdminSessionToken } from '@/lib/adminConfig';

const backendUrl = import.meta.env.VITE_SUPABASE_URL;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

/**
 * Cliente exclusivo dos painéis administrativos. O token é lido em cada
 * requisição para continuar válido depois de login/renovação da sessão.
 */
const adminFetch: typeof fetch = (input, init) => {
  const headers = new Headers(
    typeof Request !== 'undefined' && input instanceof Request ? input.headers : undefined,
  );
  if (init?.headers) new Headers(init.headers).forEach((value, key) => headers.set(key, value));

  const token = getAdminSessionToken();
  if (token) headers.set('x-admin-token', token);
  headers.set('apikey', publishableKey);

  return fetch(input, { ...init, headers });
};

export const adminSupabase = createClient<Database>(backendUrl, publishableKey, {
  global: { fetch: adminFetch },
  auth: { persistSession: false, autoRefreshToken: false },
});