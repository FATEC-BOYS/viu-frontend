// contexts/AuthContext.tsx
'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
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
  const router = useRouter();

  useEffect(() => {
    const init = async () => {
      const { data: { session }, error: sessErr } = await supabase.auth.getSession();
      if (sessErr) {
        console.error('Erro ao obter sessão:', sessErr);
        setLoading(false);
        return;
      }
      setSession(session || null);
      setUser(session?.user ?? null);

      if (session?.user) {
        await ensureProfile(session.user);
      }

      setLoading(false);
    };

    init();

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      const u = newSession?.user ?? null;
      setUser(u);

      if (u) {
        await ensureProfile(u);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  const ensureProfile = async (u: User) => {
    // 1) Tenta obter
    const { data: existing, error: selErr } = await supabase
      .from('usuarios')
      .select('id, nome, email, avatar, tipo')
      .eq('id', u.id)
      .maybeSingle();

    if (selErr) {
      console.error('Erro ao buscar perfil:', selErr);
    }

    if (existing) {
      setProfile(existing as UserProfile);
      return;
    }

    // 2) Não existe -> cria (RLS: id == auth.uid())
    const fallbackNome = u.user_metadata?.name ?? u.email?.split('@')[0] ?? 'Usuário';
    const fallbackEmail = u.email ?? null;

    const { data: inserted, error: insErr } = await supabase
      .from('usuarios')
      .insert([
        {
          id: u.id,
          nome: fallbackNome,
          email: fallbackEmail,
          avatar: u.user_metadata?.avatar_url ?? null,
          // ajuste se quiser defaultar por role de convite:
          tipo: 'DESIGNER',
        },
      ])
      .select('id, nome, email, avatar, tipo')
      .single();

    if (insErr) {
      console.error('Erro ao criar perfil:', insErr);
      // Em caso de erro, não derruba a sessão; só não seta profile.
      setProfile(null);
      return;
    }

    setProfile(inserted as UserProfile);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
    router.push('/login');
  };

  const value: AuthContextType = { session, user, profile, signOut, loading };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  return ctx;
};
