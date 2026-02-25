import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { COUNTRY_ID, PHONE_COUNTRY_CODE } from '@/config/country';


/**
 * Customer Profile Interface
 * Note: loyalty_points represents "BakePoints" for Qatar (QA) customers
 * - 1 QAR spent = 1 BakePoint earned (whole numbers only)
 * - BakePoints expire after 12 months from earning date
 * - 50 BakePoints = 1 QAR discount at checkout
 * - Redemption available only at website checkout
 */
interface CustomerProfile {
  id: string;
  first_name?: string;
  last_name?: string;
  whatsapp_number?: string;
  birthdate?: string;
  preferred_country?: string;
  loyalty_points: number;
  email?: string;
  primary_address?: string;
  profile_picture_url?: string;
  created_at: string;
  country_id?: string;
  phone_country_code?: string;
  has_completed_initial_setup?: boolean;
  phone_verified?: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  customerProfile: CustomerProfile | null;
  isLoading: boolean;
  isAuthReady: boolean;
  signUp: (email: string, password: string, userData: any) => Promise<{ error: any }>;
  signIn: (emailOrPhone: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  signInWithOAuth: (provider: 'google' | 'apple') => Promise<{ error: any }>;
  updateCustomerProfile: (data: Partial<CustomerProfile>) => Promise<{ error: any }>;
  refreshCustomerProfile: () => Promise<void>;
  updatePassword: (newPassword: string) => Promise<{ error: any }>;
  deleteAccount: () => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [customerProfile, setCustomerProfile] = useState<CustomerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    const AUTH_INIT_TIMEOUT_MS = 8000; // 8 second max for auth init
    
    const initAuth = async () => {
      console.log('🔐 [AuthContext] Initializing auth...');
      const startTime = Date.now();
      
      try {
        // Step 1: Get session with timeout protection
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Auth session timeout')), AUTH_INIT_TIMEOUT_MS)
        );
        
        const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]);
        
        if (!mounted) return;
        
        console.log('📊 [AuthContext] Session retrieved:', session?.user?.id, `(${Date.now() - startTime}ms)`);
        
        setSession(session);
        setUser(session?.user ?? null);
        
        // Step 2: Fetch profile if user exists (with its own timeout)
        if (session?.user) {
          try {
            await fetchCustomerProfile(session.user.id, session.user);
          } catch (profileError) {
            console.warn('⚠️ [AuthContext] Profile fetch failed, continuing with null:', profileError);
            // Don't block auth ready - profile can be retried later
          }
        } else {
          setCustomerProfile(null);
        }
      } catch (error: any) {
        console.error('❌ [AuthContext] Auth init error:', error?.message);
        // Still mark as ready so app doesn't stay stuck
        if (mounted) {
          setSession(null);
          setUser(null);
          setCustomerProfile(null);
        }
      } finally {
        // Step 3: ALWAYS mark auth as ready (even on error)
        if (mounted) {
          setIsAuthReady(true);
          setIsLoading(false);
          console.log('✅ [AuthContext] Auth initialization complete');
        }
      }
      
      // Step 4: Set up listener for future changes (only if mounted)
      if (!mounted) return undefined;
      
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (!mounted) return;
          
          console.log('🔐 [AuthContext] Auth state changed:', event, session?.user?.id);
          
          setSession(session);
          setUser(session?.user ?? null);
          
          if (session?.user) {
            // Use Promise.race for profile fetch with timeout
            try {
              const profileTimeout = new Promise<never>((_, reject) => 
                setTimeout(() => reject(new Error('Profile fetch timeout')), 5000)
              );
              await Promise.race([
                fetchCustomerProfile(session.user.id, session.user),
                profileTimeout
              ]);
            } catch (err) {
              console.warn('⚠️ [AuthContext] Profile fetch on auth change failed:', err);
            }
          } else {
            setCustomerProfile(null);
          }
        }
      );
      
      return subscription;
    };
    
    const subscriptionPromise = initAuth();

    return () => {
      mounted = false;
      subscriptionPromise.then(sub => sub?.unsubscribe());
    };
  }, []);


  const fetchCustomerProfile = async (userId: string, authUser?: User) => {
    try {
      const { data, error } = await supabase
        .from('Customers')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching customer profile:', error);
        return;
      }

      if (!data) {
        console.warn('⚠️ No customer profile found for user:', userId, '- attempting fallback lookup');
        
        // Fallback: try to find existing profile by email or phone
        const authEmail = authUser?.email;
        const authPhone = authUser?.user_metadata?.phone_number;
        const isRealEmail = authEmail && !authEmail.includes('@temp.pandacakes.qa');
        
        let fallbackProfile = null;
        
        if (isRealEmail) {
          const { data: byEmail } = await supabase
            .from('Customers')
            .select('*')
            .eq('email', authEmail)
            .maybeSingle();
          fallbackProfile = byEmail;
        }
        
        if (!fallbackProfile && authPhone) {
          const normalizedPhone = authPhone.replace(/\s/g, '');
          const { data: byPhone } = await supabase
            .from('Customers')
            .select('*')
            .or(`whatsapp_number.eq.${authPhone},whatsapp_number.eq.${normalizedPhone}`)
            .maybeSingle();
          fallbackProfile = byPhone;
        }
        
        if (fallbackProfile) {
          console.log('🔗 Reassigning profile via edge function:', fallbackProfile.id, '->', userId);
          try {
            const { data: reassignResult, error: reassignError } = await supabase.functions.invoke(
              'reassign-customer-profile',
              { body: { old_customer_id: fallbackProfile.id, new_user_id: userId } }
            );
            
            if (!reassignError && reassignResult?.success) {
              // Refetch the profile with the new ID
              const { data: refreshed } = await supabase
                .from('Customers')
                .select('*')
                .eq('id', userId)
                .maybeSingle();
              setCustomerProfile(refreshed || { ...fallbackProfile, id: userId });
              return;
            }
            console.warn('⚠️ Reassign edge function failed:', reassignError, reassignResult);
          } catch (reassignErr) {
            console.warn('⚠️ Reassign edge function exception:', reassignErr);
          }
          // If reassign fails, still use the profile read-only
          setCustomerProfile(fallbackProfile);
          return;
        }
        
        console.warn('⚠️ Truly no customer profile found for user:', userId);
        setCustomerProfile(null);
        return;
      }
      
      setCustomerProfile(data);
    } catch (error) {
      console.error('Error fetching customer profile:', error);
    }
  };

  const refreshCustomerProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id) {
      await fetchCustomerProfile(session.user.id, session.user);
    }
  };

  const updateCustomerProfile = async (profileData: Partial<CustomerProfile>, retryCount = 0) => {
    const MAX_RETRIES = 2;
    
    if (!user) {
      console.error('updateCustomerProfile: No user logged in');
      toast.error('Please log in to update your profile');
      return { error: new Error('No user logged in') };
    }

    console.log('updateCustomerProfile: Starting update for user:', user.id);
    console.log('updateCustomerProfile: Data to update:', profileData);

    try {
      // Step 1: Verify user exists in context
      if (!user?.id) {
        console.error('updateCustomerProfile: No user in context');
        toast.error('Authentication error. Please sign in again.');
        return { error: new Error('Authentication error') };
      }

      // Step 2: Test if we can read our own record first
      console.log('updateCustomerProfile: Testing database read access...');
      const { data: existingData, error: readError } = await supabase
        .from('Customers')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (readError) {
        console.error('updateCustomerProfile: Cannot read own record:', readError);
        toast.error('Database access error. Please try again.');
        return { error: readError };
      }

      console.log('updateCustomerProfile: Existing customer data:', existingData);

      // Step 3: If no customer record exists, create one first
      if (!existingData) {
        console.log('updateCustomerProfile: No customer record found, creating one...');
        const createData = {
          id: user.id,
          first_name: user.user_metadata?.first_name || user.user_metadata?.given_name || '',
          last_name: user.user_metadata?.last_name || user.user_metadata?.family_name || '',
          country_id: COUNTRY_ID,
          preferred_country: COUNTRY_ID,
          ...profileData
        };

        const { data: newData, error: createError } = await supabase
          .from('Customers')
          .insert(createData)
          .select()
          .single();

        if (createError) {
          console.error('updateCustomerProfile: Failed to create customer record:', createError);
          toast.error('Failed to create profile. Please try again.');
          return { error: createError };
        }

        console.log('updateCustomerProfile: Successfully created profile');
        setCustomerProfile(newData);
        
        return { error: null };
      }

      // Step 4: Update existing record
      const updateData = { ...profileData };
      console.log('updateCustomerProfile: Updating existing record with data:', updateData);

      const { data, error } = await supabase
        .from('Customers')
        .update(updateData)
        .eq('id', user.id)
        .select()
        .single();

      console.log('updateCustomerProfile: Supabase update response:', { data, error });

      if (error) {
        console.error('updateCustomerProfile: Supabase error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });

        // Provide specific error messages based on error type
        if (error.code === 'PGRST301') {
          toast.error('Permission denied. Please contact support.');
        } else if (error.code === 'PGRST116') {
          toast.error('Record not found. Please try again.');
        } else if (error.message.includes('row-level security')) {
          toast.error('Security policy violation. Please sign in again.');
        } else {
          toast.error(`Database error: ${error.message}`);
        }
        
        throw error;
      }

      if (!data) {
        console.error('updateCustomerProfile: No data returned from update');
        toast.error('Profile update failed. No data returned.');
        return { error: new Error('No data returned from update') };
      }
      
      console.log('updateCustomerProfile: Successfully updated profile');
      setCustomerProfile(data);
      
      return { error: null };
    } catch (error: any) {
      console.error('updateCustomerProfile: Caught error:', error);
      
      // Retry logic for transient errors
      if (retryCount < MAX_RETRIES && (
        error.message?.includes('network') || 
        error.message?.includes('timeout') ||
        error.code === 'PGRST301'
      )) {
        console.log(`updateCustomerProfile: Retrying (${retryCount + 1}/${MAX_RETRIES})...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))); // Exponential backoff
        return updateCustomerProfile(profileData, retryCount + 1);
      }
      
      // Show user-friendly error message
      toast.error('Failed to save profile changes. Please try again.');
      return { error };
    }
  };

  const signUp = async (email: string, password: string, userData: any) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      // Generate email from phone if not provided
      const finalEmail = email.trim() || `${userData.phoneNumber.replace(/\s/g, '')}@temp.pandacakes.qa`;
      
      const { error } = await supabase.auth.signUp({
        email: finalEmail,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            first_name: userData.firstName,
            last_name: userData.lastName,
            phone_number: userData.phoneNumber,
            birthdate: userData.birthdate || null,
            is_temp_email: !email.trim()
          }
        }
      });

      if (error) {
        console.error('Signup error:', error.message);
        return { 
          error: {
            message: error.message,
            status: error.status
          }
        };
      }

      // Fire-and-forget: Create customer profile via edge function
      // Don't await -- user can proceed immediately after signUp succeeds.
      // The onAuthStateChange listener in AuthContext handles profile creation as fallback.
      supabase.functions.invoke('auth-signup', {
        body: {
          email: finalEmail,
          phone: userData.phoneNumber,
          country_id: COUNTRY_ID,
          userData: {
            first_name: userData.firstName,
            last_name: userData.lastName,
            whatsapp_number: userData.phoneNumber,
            birthdate: userData.birthdate || null,
            existingCustomerId: userData.existingCustomerId || null,
            preferred_country: COUNTRY_ID
          }
        }
      }).then(({ error: profileError }) => {
        if (profileError) {
          console.warn('Profile creation error (non-blocking):', profileError);
        } else {
          console.log('✅ Profile created via edge function');
        }
      });

      return { error: null };
    } catch (error: any) {
      console.error('Signup exception:', error);
      return { 
        error: {
          message: error.message || 'An unexpected error occurred during signup'
        }
      };
    }
  };

  const signIn = async (emailOrPhone: string, password: string) => {
    try {
      const trimmedInput = emailOrPhone.trim();
      
      // Detect if input is a phone number (E.164 format: starts with + and contains digits)
      const isPhone = /^\+[\d\s]+$/.test(trimmedInput);
      
      let loginEmail = trimmedInput;
      
      if (isPhone) {
        // OPTIMIZED: Try both common temp email formats in PARALLEL
        const normalizedPhone = trimmedInput.replace(/\s/g, '');
        const email1 = `${normalizedPhone}@temp.pandacakes.qa`;
        const email2 = `${trimmedInput}@temp.pandacakes.qa`;
        
        const [res1, res2] = await Promise.allSettled([
          supabase.auth.signInWithPassword({ email: email1, password }),
          supabase.auth.signInWithPassword({ email: email2, password }),
        ]);
        
        // Use whichever succeeded
        const success1 = res1.status === 'fulfilled' && !res1.value.error;
        const success2 = res2.status === 'fulfilled' && !res2.value.error;
        
        if (success1 || success2) {
          return { error: null };
        }
        
        // Both failed - set error for fallback path below
        loginEmail = email1;
      }
      
      // Try to authenticate (email login, or phone fallback continues below)
      let { error } = isPhone 
        ? { error: { message: 'Invalid login credentials' } as any }
        : await supabase.auth.signInWithPassword({ email: loginEmail, password });
      
      // If failed and it's a phone number, try alternative lookup via DB + edge function
      if (error && isPhone && error.message.includes('Invalid login credentials')) {
        const normalizedPhone = trimmedInput.replace(/\s/g, '');
        const digitsOnly = normalizedPhone.replace(/\D/g, '');
        const withPlus = `+${digitsOnly}`;

        // Last resort: look up actual auth email via Customers table + edge function
        // Use formatPhoneWithCode for proper country code splitting instead of hardcoded 3-digit assumption
        const { formatPhoneWithCode } = await import('@/utils/phoneFormatting');
        const formattedWithSpace = formatPhoneWithCode(withPlus);
        
        const { data: customers } = await supabase
          .from('Customers')
          .select('id')
          .or(`whatsapp_number.eq.${withPlus},whatsapp_number.eq.${formattedWithSpace},whatsapp_number.ilike.%${digitsOnly.slice(-8)}`)
          .order('created_at', { ascending: false })
          .limit(1);
        
        const customer = customers?.[0];
        
        if (customer) {
          const { data: authLookup } = await supabase.functions.invoke('debug-auth-user', {
            body: { customer_id: customer.id }
          });
          
          if (authLookup?.auth_user_by_id?.email) {
            const realEmail = authLookup.auth_user_by_id.email;
            console.log(`📧 [Login] Found auth email via fallback: ${realEmail}`);
            const realResult = await supabase.auth.signInWithPassword({
              email: realEmail,
              password
            });
            if (!realResult.error) {
              return { error: null };
            }
            error = realResult.error;
          }
        }
      }
      
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast.error(`Incorrect ${isPhone ? 'phone number' : 'email'} or password. Please try again.`);
        } else {
          toast.error(error.message);
        }
        return { error };
      }

      toast.success('Welcome back!');
      return { error: null };
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Login failed. Please try again.');
      return { error };
    }
  };


  const signInWithOAuth = async (provider: 'google' | 'apple') => {
    try {
      // Store current URL for redirect after login
      const currentPath = window.location.pathname;
      if (currentPath !== '/login' && currentPath !== '/signup') {
        sessionStorage.setItem('auth_return_url', currentPath);
      }
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });

      return { error };
    } catch (error) {
      return { error };
    }
  };

  const signOut = async () => {
    console.log('🚪 signOut: Starting sign out process');
    
    try {
      // Step 1: Clear local React state first (keeps UI responsive)
      console.log('🧹 signOut: Clearing local state...');
      setUser(null);
      setSession(null);
      setCustomerProfile(null);
      
      // Step 2: Sign out from Supabase BEFORE clearing storage (critical for proper token invalidation)
      console.log('🔐 signOut: Calling Supabase sign out...');
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      
      if (error) {
        console.error('❌ Sign out error:', error);
        toast.error('Sign out failed. Please try again.');
        return;
      }
      
      console.log('✅ Supabase sign out successful');
      
      // Step 3: Wait 200ms to ensure Supabase cleanup completes
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Step 4: NOW clear localStorage and sessionStorage
      console.log('🗑️ signOut: Clearing storage...');
      try {
        // Clear all cart/wishlist data
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (key.startsWith('panda_cakes_')) {
            localStorage.removeItem(key);
          }
        });
        
        // Clear session storage
        sessionStorage.clear();
        
        console.log('✅ Storage cleared');
      } catch (storageError) {
        console.error('⚠️ Error clearing storage:', storageError);
      }
      
      toast.success('Signed out successfully');
      
      // Step 5: Force redirect with full page reload to clear all cached state
      console.log('🔄 signOut: Redirecting to login...');
      window.location.href = '/login';
    } catch (error) {
      console.error('💥 signOut: Fatal error:', error);
      toast.error('Error signing out');
      
      // Force reload as fallback
      window.location.href = '/login';
    }
  };

  const updatePassword = async (newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        console.error('Password update error:', error);
        return { error };
      }

      return { error: null };
    } catch (error: any) {
      console.error('Password update exception:', error);
      return { error };
    }
  };

  const deleteAccount = async (): Promise<{ error: any }> => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        return { error: { message: 'Not authenticated' } };
      }

      console.log('🗑️ [AuthContext] Deleting account...');

      const response = await fetch(
        `https://qlffjhyciwabyzolzdjb.supabase.co/functions/v1/delete-account`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${sessionData.session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const result = await response.json();
      
      if (!response.ok) {
        console.error('❌ Delete account failed:', result);
        return { error: { message: result.error || 'Failed to delete account' } };
      }

      console.log('✅ Account deleted successfully');

      // Clear local state
      setUser(null);
      setSession(null);
      setCustomerProfile(null);
      
      // Sign out globally to invalidate all sessions and prevent auto-recreation
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (signOutErr) {
        console.warn('Sign out after delete failed (expected if auth user already deleted):', signOutErr);
      }

      // Clear ALL storage to remove any cached state
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (storageError) {
        console.warn('Error clearing storage:', storageError);
      }
      
      // Force full page reload to login - clears all cached state
      window.location.href = '/login';
      return { error: null };
    } catch (error: any) {
      console.error('❌ Delete account exception:', error);
      return { error };
    }
  };

  const value = {
    user,
    session,
    customerProfile,
    isLoading,
    isAuthReady,
    signUp,
    signIn,
    signOut,
    signInWithOAuth,
    updateCustomerProfile,
    refreshCustomerProfile,
    updatePassword,
    deleteAccount
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    // Return safe defaults instead of throwing to prevent React Error #310
    console.warn('[AuthContext] Hook used outside provider, returning defaults');
    return {
      user: null,
      session: null,
      customerProfile: null,
      isLoading: true,
      isAuthReady: false,
      signUp: async () => ({ error: new Error('Auth not initialized') }),
      signIn: async () => ({ error: new Error('Auth not initialized') }),
      signOut: async () => {},
      signInWithOAuth: async () => ({ error: new Error('Auth not initialized') }),
      updateCustomerProfile: async () => ({ error: new Error('Auth not initialized') }),
      refreshCustomerProfile: async () => {},
      updatePassword: async () => ({ error: new Error('Auth not initialized') }),
      deleteAccount: async () => ({ error: new Error('Auth not initialized') })
    };
  }
  return context;
}