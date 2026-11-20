// Shared by both functions. Deno, as Supabase's Edge Functions run it.
import { createClient } from 'jsr:@supabase/supabase-js@2';

/**
 * The service role: past Row Level Security. The functions use it only after
 * their own checks, which is the point: the tables take no writes from the
 * REST API, so every document in them went through a kit's check.
 */
export const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } },
);

// The editor and the form's page call from your site's origin.
export const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
};

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });

/** Postgres refused a duplicate: a slug already taken, a second active email design. */
export const isUniqueViolation = (error: { code?: string } | null) => error?.code === '23505';
