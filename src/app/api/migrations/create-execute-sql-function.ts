import { createClient } from '@/lib/supabaseClient'

export async function createExecuteSqlFunction() {
  const supabase = createClient()
  
  try {
    // Create the execute_sql function using direct SQL
    const { data, error } = await supabase
      .from('chatbots')
      .select('id')
      .limit(1)
      .maybeSingle()
    
    // We just need to make a simple query to establish connection
    // The actual function creation will be done through the Supabase dashboard
    
    if (error) {
      console.error('Error connecting to database:', error)
      return { 
        success: false, 
        error,
        message: 'Please create the execute_sql function in the Supabase dashboard SQL editor with the following SQL:\n\n' +
          'CREATE OR REPLACE FUNCTION public.execute_sql(sql text)\n' +
          'RETURNS void\n' +
          'LANGUAGE plpgsql\n' +
          'SECURITY DEFINER\n' +
          'AS $$\n' +
          'BEGIN\n' +
          '  EXECUTE sql;\n' +
          'END;\n' +
          '$$;\n\n' +
          'GRANT EXECUTE ON FUNCTION public.execute_sql(text) TO authenticated;\n' +
          'GRANT EXECUTE ON FUNCTION public.execute_sql(text) TO service_role;'
      }
    }
    
    return { 
      success: true, 
      message: 'Database connection successful. Please create the execute_sql function in the Supabase dashboard.'
    }
  } catch (error) {
    console.error('Error in createExecuteSqlFunction:', error)
    return { success: false, error }
  }
}