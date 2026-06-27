// Auth context. Two modes:
//  • Supabase configured → real email/password auth.
//  • Not configured (demo) → a hardcoded gate: only owner1@gmail.com / owner1 gets in.
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "./supabase";

// Demo gate credentials (client-side only; for the live, secured version use Supabase auth).
const DEMO_EMAIL = "owner1@gmail.com";
const DEMO_PASSWORD = "owner1";
const DEMO_FLAG = "moodmix-demo-auth";

interface AuthContextValue {
  configured: boolean;
  loading: boolean;
  authed: boolean;
  session: Session | null;
  user: User | null;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const demoUser = { email: DEMO_EMAIL, user_metadata: { full_name: "Owner" } } as unknown as User;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [demoAuthed, setDemoAuthed] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      if (typeof window !== "undefined") setDemoAuthed(sessionStorage.getItem(DEMO_FLAG) === "1");
      setLoading(false);
      return;
    }
    if (!supabase) return;
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoading(false);
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  const authed = isSupabaseConfigured ? !!session : demoAuthed;

  const value: AuthContextValue = {
    configured: isSupabaseConfigured,
    loading,
    authed,
    session,
    user: session?.user ?? (demoAuthed ? demoUser : null),
    async signIn(email, password) {
      if (!isSupabaseConfigured) {
        if (email.trim().toLowerCase() === DEMO_EMAIL && password === DEMO_PASSWORD) {
          sessionStorage.setItem(DEMO_FLAG, "1");
          setDemoAuthed(true);
          return { error: null };
        }
        return { error: "Incorrect email or password." };
      }
      const { error } = await supabase!.auth.signInWithPassword({ email, password });
      return { error: error?.message ?? null };
    },
    async signUp(email, password, fullName) {
      if (!isSupabaseConfigured) return { error: "Sign-up is disabled — use the owner login." };
      const { error } = await supabase!.auth.signUp({ email, password, options: { data: { full_name: fullName } } });
      return { error: error?.message ?? null };
    },
    async signOut() {
      if (!isSupabaseConfigured) {
        sessionStorage.removeItem(DEMO_FLAG);
        setDemoAuthed(false);
        return;
      }
      await supabase!.auth.signOut();
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
