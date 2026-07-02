const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || 'placeholder-service-key';

// Using the service key for backend operations to bypass RLS when acting as the system/agent
const supabase = createClient(supabaseUrl, supabaseServiceKey);

module.exports = { supabase };
