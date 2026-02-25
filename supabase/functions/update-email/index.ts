import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { user_id, new_email } = await req.json()

    if (!user_id || !new_email) {
      return new Response(
        JSON.stringify({ error: 'user_id and new_email are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(new_email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Update email in auth.users using admin API
    // Mark as confirmed immediately and set is_temp_email to false
    const { error } = await supabaseAdmin.auth.admin.updateUserById(user_id, {
      email: new_email,
      email_confirm: true,
      user_metadata: {
        is_temp_email: false
      }
    })

    if (error) {
      console.error('Error updating email:', error)
      const isDuplicate = error.message?.includes('duplicate') || error.message?.includes('unique')
      return new Response(
        JSON.stringify({ 
          error: isDuplicate 
            ? 'This email is already associated with another account' 
            : 'Failed to update email',
          code: isDuplicate ? 'DUPLICATE_EMAIL' : 'UPDATE_FAILED'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Email updated successfully for user ${user_id} to ${new_email}`)

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
