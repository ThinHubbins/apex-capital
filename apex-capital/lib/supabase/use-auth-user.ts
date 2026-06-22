// hooks/use-auth-user.ts
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export function useAuthUser() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    // Check initial session
    supabase.auth.getSession().then(({ data }) => {
      setIsLoggedIn(!!data.session);
    });

    // React to login/logout events
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  return { isLoggedIn };
}