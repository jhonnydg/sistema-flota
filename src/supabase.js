import { createClient } from '@supabase/supabase-js'

// ⚠️  PASO 4 DE LA GUIA: Pegá acá tus credenciales de Supabase
const SUPABASE_URL = 'https://uedlqvpzdxanyrtovlxk.supabase.co'
const SUPABASE_KEY = 'sb_publishable_HrNGbXS-vwFcgCNfDPWUuQ_adehsOxi'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
