// contexts/AuthContext.tsx
'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import { syncUserWithBackend } from '@/lib/syncWithBackend';
import { useRouter } from 'next/navigation';

export type UserProfile = {
  id: string;
  nome: string | null;
  email: string | null;
  avatar?: string | null;
  tipo: 'DESIGNER' | 'CLIENTE';
};

type AuthContextType = {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  signOut: () => Promise<void>;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

type AuthProviderProps = { children: ReactNode };

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [safeMode, setSafeMode] = useState(false); // lido via window (sem Suspense)
  const router = useRouter();

  // Lê ?safe=1 apenas no cliente (evita Suspense no 404/layout)
  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      setSafeMode(sp.get('safe') === '1');
    } catch {
      setSafeMode(false);
    }
  }, []);

  useEffect(() => {
    let alive = true;

    const init = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!alive) return;

        if (error) {
          console.error('Erro ao obter sessão:', error);
          setSession(null);
          setUser(null);
          setProfile(null);
        } else {
          const sess = data?.session ?? null;
          setSession(sess);
          setUser(sess?.user ?? null);

          // Em links públicos (sem sessão), isso nem roda; não quebra os viewers.
          if (sess?.user && !safeMode) {
            ensureProfile(sess.user).catch((e) =>
              console.warn('ensureProfile falhou (ignorado):', e)
            );
          }
        }
      } catch (e) {
        console.error('Init auth falhou:', e);
        setSession(null);
        setUser(null);
        setProfile(null);
      } finally {
        if (alive) setLoading(false);
      }
    };

    init();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!alive) return;
      setSession(newSession);
      const u = newSession?.user ?? null;
      setUser(u);

      if (u && !safeMode) {
        ensureProfile(u).catch((e) =>
          console.warn('ensureProfile (onAuthStateChange) falhou (ignorado):', e)
        );
      } else {
        setProfile(null);
      }
      // nunca deixe a UI presa em loading
      setLoading(false);
    });

    return () => {
      alive = false;
      listener?.subscription.unsubscribe();
    };
    // safeMode controla apenas se buscamos/criamos perfil
  }, [safeMode]);

  const ensureProfile = async (u: User) => {
    try {
      // tenta obter perfil de usuario_auth (vinculado ao Supabase Auth)
      const { data: existing, error: selErr } = await supabase
        .from('usuario_auth')
        .select('id, nome, email, avatar, tipo')
        .eq('id', u.id)
        .maybeSingle();

      if (selErr) {
        console.warn('Erro ao buscar perfil (tolerado):', selErr);
      }

      if (existing) {
        setProfile(existing as UserProfile);
        // Sincroniza com backend mesmo se perfil já existir
        syncUserWithBackend(u).catch((e) =>
          console.warn('Sincronização backend falhou (ignorado):', e)
        );
        return;
      }

      // cria perfil básico (tolerante a falhas/RLS)
      const fallbackNome =
        (u.user_metadata as any)?.name ?? u.email?.split('@')[0] ?? 'Usuário';
      const fallbackEmail = u.email ?? null;

      const { data: inserted, error: insErr } = await supabase
        .from('usuario_auth')
        .upsert([
          {
            id: u.id,
            nome: fallbackNome,
            email: fallbackEmail,
            avatar: (u.user_metadata as any)?.avatar_url ?? null,
            tipo: 'DESIGNER',
          },
        ], { onConflict: 'id' })
        .select('id, nome, email, avatar, tipo')
        .single();

      if (insErr) {
        console.warn('Erro ao criar perfil (tolerado):', insErr);
        setProfile(null);
        return;
      }

      setProfile(inserted as UserProfile);

      // Sincroniza com backend após criar perfil
      syncUserWithBackend(u).catch((e) =>
        console.warn('Sincronização backend falhou (ignorado):', e)
      );
    } catch (e) {
      console.warn('ensureProfile exceção (tolerada):', e);
      setProfile(null);
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('signOut supabase falhou (segue mesmo assim):', e);
    }

    // limpa storages (garante logout manual)
    try {
      Object.keys(localStorage).forEach((k) => {
        if (k.startsWith('sb-')) localStorage.removeItem(k);
      });
      sessionStorage.clear();
      indexedDB.deleteDatabase('Supabase');
    } catch {}

    setSession(null);
    setUser(null);
    setProfile(null);
    router.push('/login');
  };

  const value: AuthContextType = { session, user, profile, signOut, loading };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  return ctx;
};
