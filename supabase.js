import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nnnezdmpqjyaundmllix.supabase.co';
const supabaseAnonKey = 'sb_publishable_kKyrFu2R4k0qNp1ZIqbKEg_DY9bhc-7';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
