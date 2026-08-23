import { createClient } from '@supabase/supabase-js';
const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || 'https://awloipabxzrsklhdggme.supabase.co';
const key = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || 'sb_publishable_FyZqnkwgegV4-6ZBCjxN7w_La6MKBvO';
export const isConfigured = Boolean(url && key);
export const supabase = isConfigured ? createClient(url!, key!) : null;

