"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthUser } from "./supabase/use-auth-user";

type Options = {
  require: "authenticated" | "unauthenticated";
  redirectTo: string;
};

export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  { require, redirectTo }: Options,
) {
  return function ProtectedPage(props: P) {
    const { isLoggedIn, loading } = useAuthUser();
    const router = useRouter();

    useEffect(() => {
      if (loading) return;
      if (require === "authenticated" && !isLoggedIn) router.replace(redirectTo);
      if (require === "unauthenticated" && isLoggedIn) router.replace(redirectTo);
    }, [isLoggedIn, loading, router]);

    if (loading) return null; // or a spinner

    if (require === "authenticated" && !isLoggedIn) return null;
    if (require === "unauthenticated" && isLoggedIn) return null;

    return <Component {...props} />;
  };
}