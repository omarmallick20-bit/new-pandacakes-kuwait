import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Silent component that triggers the category image migration
 * on first app load. Runs only once and doesn't show any UI.
 * 
 * IMPORTANT: This component ALWAYS calls hooks in the same order
 * to comply with React's Rules of Hooks. Conditional logic is
 * handled INSIDE the useEffect, not before hooks.
 */
export function TriggerImageMigration() {
  // Read localStorage in useState initializer (safe, runs once)
  const [alreadyTriggered] = useState(() => {
    if (typeof window === 'undefined') return true; // SSR safety
    return localStorage.getItem('category_migration_triggered') === 'true';
  });

  // Ref to prevent double-invokes in StrictMode or multiple mounts
  const hasStartedRef = useRef(false);

  useEffect(() => {
    // Skip if already triggered (from localStorage) or already started this mount
    if (alreadyTriggered || hasStartedRef.current) {
      if (alreadyTriggered) {
        console.log('✅ Category image migration already triggered');
      }
      return;
    }

    // Mark as started to prevent duplicate invokes
    hasStartedRef.current = true;

    const triggerMigration = async () => {
      try {
        console.log('🚀 Triggering category image migration...');
        
        const { data, error } = await supabase.functions.invoke('migrate-category-images');

        if (error) {
          console.error('❌ Migration error:', error);
          return;
        }

        console.log('✅ Migration completed:', data);
        
        // Mark as triggered so we don't run it again
        localStorage.setItem('category_migration_triggered', 'true');
      } catch (error) {
        console.error('💥 Error triggering migration:', error);
      }
    };

    triggerMigration();
  }, [alreadyTriggered]);

  // This component renders nothing
  return null;
}
