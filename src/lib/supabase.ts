/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

// Doc cau hinh tu bien moi truong Vite hoac dung gia tri du phong
const meta = import.meta as any;
const DEFAULT_SUPABASE_URL = 'https://uaxkewivstxlgbgjfnni.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_M-3LJsXBWaGW9aTBJdC1mg_XDTT-0Px';

const supabaseUrl = (meta && meta.env && meta.env.VITE_SUPABASE_URL) || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = (meta && meta.env && meta.env.VITE_SUPABASE_ANON_KEY) || DEFAULT_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.warn(
    'HueLegend: Supabase chua duoc cau hinh VITE_SUPABASE_URL va VITE_SUPABASE_ANON_KEY. Ung dung se hoat dong o che do Du lieu On-Chain / Fallback local.'
  );
} else {
  console.log('HueLegend: Da ket noi thanh cong voi Supabase Database:', supabaseUrl);
}

// Khoi tao Supabase Client voi thiet lap Realtime va Auth
export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
);
