/**
 * Context de Autenticação
 * Gerencia estado do usuário logado
 */

import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { Usuario } from '../../shared/api';
import { useCurrentUser, apiClient } from './api-client';

// ===== TIPOS =====

interface AuthContextType {
  user: Usuario | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: Error | null;
  login: (email: string, senha: string) => Promise<void>;
  logout: () => Promise<void>;
  refetchUser: () => void;
}

// ===== CONTEXT =====

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ===== PROVIDER =====

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  // Usar o hook do React Query para gerenciar o usuário atual
  const {
    data: user,
    isLoading,
    error,
    refetch: refetchUser,
  } = useCurrentUser();

  const isAuthenticated = !!user && apiClient.isAuthenticated();

  // Função de login
  const login = async (email: string, senha: string) => {
    try {
      const response = await apiClient.login({ email, senha });
      
      // O token já é salvo automaticamente no apiClient.login()
      // O React Query vai invalidar e buscar o usuário automaticamente
      await refetchUser();
      
    } catch (error) {
      console.error('Erro no login:', error);
      throw error;
    }
  };

  // Função de logout
  const logout = async () => {
    try {
      await apiClient.logout();
      // O React Query vai limpar o cache automaticamente
      
    } catch (error) {
      console.error('Erro no logout:', error);
      // Mesmo com erro, limpar dados locais
      apiClient.removeToken();
    }
  };

  // Verificar token ao inicializar
  useEffect(() => {
    // Se tem token mas não tem user, tentar buscar
    if (apiClient.isAuthenticated() && !user && !isLoading) {
      refetchUser();
    }
  }, [user, isLoading, refetchUser]);

  const value: AuthContextType = {
    user: user || null,
    isAuthenticated,
    isLoading,
    error: error as Error | null,
    login,
    logout,
    refetchUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// ===== HOOK PERSONALIZADO =====

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  
  return context;
}

// ===== COMPONENTE DE PROTEÇÃO DE ROTAS =====

interface ProtectedRouteProps {
  children: ReactNode;
  fallback?: ReactNode;
  requireAuth?: boolean;
}

export function ProtectedRoute({ 
  children, 
  fallback = <div>Redirecionando...</div>,
  requireAuth = true 
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();

  // Mostrar loading enquanto verifica autenticação
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Se precisa estar logado mas não está
  if (requireAuth && !isAuthenticated) {
    return fallback;
  }

  // Se não pode estar logado mas está (ex: página de login)
  if (!requireAuth && isAuthenticated) {
    return fallback;
  }

  return <>{children}</>;
}

// ===== HOOKS UTILITÁRIOS =====

// Hook para verificar permissões por tipo de usuário
export function useUserPermissions() {
  const { user } = useAuth();

  return {
    isDesigner: user?.tipo === 'DESIGNER',
    isCliente: user?.tipo === 'CLIENTE',
    canCreateProject: user?.tipo === 'DESIGNER',
    canUploadArt: !!user, // Qualquer usuário logado
    canApproveArt: user?.tipo === 'CLIENTE',
    canGiveFeedback: !!user,
  };
}

// Hook para dados do usuário com fallbacks
export function useUserProfile() {
  const { user, isAuthenticated } = useAuth();

  return {
    user,
    isAuthenticated,
    displayName: user?.nome || 'Usuário',
    avatar: user?.avatar || '',
    email: user?.email || '',
    initials: user?.nome
      ? user.nome
          .split(' ')
          .map(n => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2)
      : 'U',
  };
}