// Initialize Supabase client
const supabaseUrl = 'https://ctyqetwzowcqqxcwiukd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN0eXFldHd6b3djcXF4Y3dpdWtkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk4MjA2NzksImV4cCI6MjA1NTM5NjY3OX0.V1Fd4siW6lP5HnfWK-evSae_CXk7pAX0luZZnbcCe3o';

export const supabase = supabase.createClient(supabaseUrl, supabaseKey);