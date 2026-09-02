import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { verifyAdminSessionToken } from "../_shared/admin-session.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-token',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[USER-CLOUD-STORAGE] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminSessionSecret = Deno.env.get('MRO_ADMIN_SESSION_SECRET') || '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, username, email, auth_token, daysRemaining, profileSessions, archivedProfiles, lifetimeCreativeUsedAt, activate } = await req.json();
    
    logStep("Request received", { action, username, hasEmail: !!email, hasAuthToken: !!auth_token, hasLifetimeCreativeUsedAt: !!lifetimeCreativeUsedAt });

    if (action === 'get_creatives_pro_users' || action === 'set_creatives_pro') {
      const adminToken = req.headers.get('x-admin-token');
      const admin = await verifyAdminSessionToken(adminToken, adminSessionSecret, 'mro-main-admin');
      if (!admin) {
        return new Response(
          JSON.stringify({ success: false, error: 'Sessão administrativa inválida ou expirada' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
        );
      }
    }

    // GET_CREATIVES_PRO_USERS - No username required
    if (action === 'get_creatives_pro_users') {
      const { data, error } = await supabase
        .from('user_sessions')
        .select('squarecloud_username, updated_at, days_remaining, profile_sessions')
        .order('updated_at', { ascending: false })
        .limit(200);

      if (error) {
        logStep('Error fetching PRO users', { error: error.message });
        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }

      // Filter users with creativesUnlocked = true in any profile session
      const proUsers = (data || []).filter(user => {
        const sessions = user.profile_sessions as any[] || [];
        return sessions.some((s: any) => s.creativesUnlocked === true);
      }).map(user => ({
        squarecloud_username: user.squarecloud_username,
        activated_at: user.updated_at,
        days_remaining: user.days_remaining
      }));

      logStep(`Found ${proUsers.length} PRO users`);
      return new Response(
        JSON.stringify({ success: true, users: proUsers }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!username) {
      return new Response(
        JSON.stringify({ success: false, error: 'Username is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const normalizedUsername = username.toLowerCase();

    // Authentication required for save and load actions
    if (action === 'save' || action === 'load') {
      if (!auth_token) {
        logStep("Missing auth_token for protected action");
        return new Response(
          JSON.stringify({ success: false, error: 'Authentication required' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
        );
      }

      // Verify auth_token format: must be username_timestamp_hash format
      const expectedPrefix = `${normalizedUsername}_`;
      if (!auth_token.startsWith(expectedPrefix)) {
        logStep("Invalid auth_token - username mismatch");
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid authentication token' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
        );
      }

      // For existing sessions with email, verify the email matches
      const { data: existingSession } = await supabase
        .from('user_sessions')
        .select('id, email')
        .eq('squarecloud_username', normalizedUsername)
        .abortSignal(AbortSignal.timeout(5000))
        .maybeSingle();

      if (existingSession?.email && email) {
        if (existingSession.email.toLowerCase() !== email.toLowerCase()) {
          logStep("Email mismatch - unauthorized", { stored: '***', provided: '***' });
          return new Response(
            JSON.stringify({ success: false, error: 'Unauthorized: email mismatch' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
          );
        }
      }
    }

    // LOAD - Get user data from database
    if (action === 'load') {
      const { data, error } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('squarecloud_username', normalizedUsername)
        .maybeSingle();

      if (error) {
        logStep('Error loading user data', { error: error.message });
        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }

      if (!data) {
        logStep(`No existing data for user ${normalizedUsername}`);
        return new Response(
          JSON.stringify({ success: true, exists: false, data: null }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update last_access timestamp on load (user login)
      await supabase
        .from('user_sessions')
        .update({ last_access: new Date().toISOString() })
        .eq('id', data.id);

      logStep(`Loaded data for ${normalizedUsername}`, { 
        profileCount: data.profile_sessions?.length || 0 
      });
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          exists: true, 
          data: {
            email: data.email,
            daysRemaining: data.days_remaining,
            profileSessions: data.profile_sessions || [],
            archivedProfiles: data.archived_profiles || [],
            lifetimeCreativeUsedAt: data.lifetime_creative_used_at,
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // SAVE - Save/update user data to database
    if (action === 'save') {
      const totalCreatives = (profileSessions || []).reduce((sum: number, p: any) => sum + (p.creatives?.length || 0), 0);
      const totalStrategies = (profileSessions || []).reduce((sum: number, p: any) => sum + (p.strategies?.length || 0), 0);
      logStep(`Saving data`, { 
        username: normalizedUsername,
        profiles: profileSessions?.length || 0, 
        strategies: totalStrategies, 
        creatives: totalCreatives 
      });
      
      // First check if user exists AND get existing profile_sessions to preserve creativesUnlocked
      const { data: existing } = await supabase
        .from('user_sessions')
        .select('id, email, profile_sessions')
        .eq('squarecloud_username', normalizedUsername)
        .maybeSingle();

      // CRITICAL: Preserve creativesUnlocked flag from existing profile_sessions
      // This prevents admin-set PRO access from being overwritten by client saves
      let finalProfileSessions = profileSessions || [];
      if (existing?.profile_sessions) {
        const existingUnlockedMap = new Map<string, boolean>();
        // Collect creativesUnlocked status from existing sessions
        (existing.profile_sessions as any[]).forEach((ps: any) => {
          if (ps.id && ps.creativesUnlocked !== undefined) {
            existingUnlockedMap.set(ps.id, ps.creativesUnlocked);
          }
          // Also check for a global unlock flag (no id)
          if (!ps.id && ps.creativesUnlocked !== undefined) {
            existingUnlockedMap.set('__global__', ps.creativesUnlocked);
          }
        });
        
        // Apply existing creativesUnlocked to new sessions
        const globalUnlocked = existingUnlockedMap.get('__global__');
        finalProfileSessions = finalProfileSessions.map((ps: any) => {
          const existingUnlocked = ps.id ? existingUnlockedMap.get(ps.id) : undefined;
          // Preserve existing unlock status, or use global, or keep current value
          const shouldBeUnlocked = existingUnlocked !== undefined ? existingUnlocked : 
                                   (globalUnlocked !== undefined ? globalUnlocked : ps.creativesUnlocked);
          return {
            ...ps,
            creativesUnlocked: shouldBeUnlocked
          };
        });
        
        logStep('Preserved creativesUnlocked from existing sessions', { 
          unlockedCount: Array.from(existingUnlockedMap.values()).filter(v => v).length 
        });
      }

      // If daysRemaining is provided, use it; otherwise don't overwrite existing value
      const saveData: any = {
        squarecloud_username: normalizedUsername,
        profile_sessions: finalProfileSessions,
        archived_profiles: archivedProfiles || [],
      };
      
      // Save lifetime creative usage timestamp if provided
      if (lifetimeCreativeUsedAt !== undefined) {
        saveData.lifetime_creative_used_at = lifetimeCreativeUsedAt;
      }

      // Only update days_remaining if explicitly provided and not undefined
      if (daysRemaining !== undefined && daysRemaining !== null) {
        saveData.days_remaining = daysRemaining;
      } else if (!existing) {
        // New user - set default days
        saveData.days_remaining = 365;
      }
      // If existing user and no daysRemaining provided, keep existing value

      // Only set email if user doesn't exist yet OR has no email set
      if (email && (!existing || !existing.email)) {
        saveData.email = email;
      }

      let result;
      if (existing) {
        const { data, error } = await supabase
          .from('user_sessions')
          .update(saveData)
          .eq('id', existing.id)
          .select()
          .single();
        result = { data, error };
      } else {
        const { data, error } = await supabase
          .from('user_sessions')
          .insert(saveData)
          .select()
          .single();
        result = { data, error };
      }

      if (result.error) {
        logStep('Error saving user data', { error: result.error.message });
        return new Response(
          JSON.stringify({ success: false, error: result.error.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }

      logStep(`Saved data for ${normalizedUsername} successfully`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          data: {
            email: result.data.email,
            daysRemaining: result.data.days_remaining,
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET_EMAIL - Check if email is locked (no auth required - read-only, non-sensitive)
    if (action === 'get_email') {
      const { data } = await supabase
        .from('user_sessions')
        .select('email')
        .eq('squarecloud_username', normalizedUsername)
        .maybeSingle();

      return new Response(
        JSON.stringify({ 
          success: true, 
          email: data?.email || null,
          isLocked: !!data?.email
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // SET_CREATIVES_PRO - Admin action to activate/deactivate PRO creatives for a user
    if (action === 'set_creatives_pro') {
      const shouldActivate = activate !== false;
      
      logStep(`Setting creatives PRO for ${normalizedUsername}`, { activate: shouldActivate });
      
      // Check if user exists
      const { data: existing } = await supabase
        .from('user_sessions')
        .select('id, profile_sessions')
        .eq('squarecloud_username', normalizedUsername)
        .maybeSingle();

      if (!existing) {
        // Create user record with creativesUnlocked flag
        const { error: insertError } = await supabase
          .from('user_sessions')
          .insert({
            squarecloud_username: normalizedUsername,
            profile_sessions: [{ creativesUnlocked: shouldActivate, activatedAt: new Date().toISOString() }],
            days_remaining: 9999 // Vitalício
          });

        if (insertError) {
          logStep('Error creating user for PRO activation', { error: insertError.message });
          return new Response(
            JSON.stringify({ success: false, error: insertError.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
          );
        }
      } else {
        // Update existing user's profile_sessions to include creativesUnlocked flag
        const profileSessions = existing.profile_sessions || [];
        
        // Update all existing sessions with creativesUnlocked flag
        // When activating PRO: reset creativesRemaining to 6 (fresh start)
        const updatedSessions = profileSessions.map((ps: any) => ({
          ...ps,
          creativesUnlocked: shouldActivate,
          // Reset credits to 6 when activating PRO
          creativesRemaining: shouldActivate ? 6 : ps.creativesRemaining
        }));
        
        // If no sessions exist, create a placeholder with the flag
        if (updatedSessions.length === 0) {
          updatedSessions.push({ 
            creativesUnlocked: shouldActivate, 
            creativesRemaining: 6,
            activatedAt: new Date().toISOString() 
          });
        }

        // Also clear lifetimeCreativeUsedAt when activating PRO (user gets fresh credits)
        const updateData: any = { 
          profile_sessions: updatedSessions,
          updated_at: new Date().toISOString()
        };
        
        if (shouldActivate) {
          updateData.lifetime_creative_used_at = null; // Clear monthly usage restriction
        }

        const { error: updateError } = await supabase
          .from('user_sessions')
          .update(updateData)
          .eq('id', existing.id);

        if (updateError) {
          logStep('Error updating user for PRO activation', { error: updateError.message });
          return new Response(
            JSON.stringify({ success: false, error: updateError.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
          );
        }
        
        logStep(`Reset credits to 6 for ${normalizedUsername}`);
      }

      logStep(`Successfully ${shouldActivate ? 'activated' : 'deactivated'} PRO creatives for ${normalizedUsername}`);
      return new Response(
        JSON.stringify({ success: true, activated: shouldActivate }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Invalid action' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );

  } catch (error) {
    logStep('Error in user-cloud-storage', { error: error instanceof Error ? error.message : 'Unknown' });
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
