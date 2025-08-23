/**
 * Configuração do React Query
 * Provider global para cache e estado
 */

import React, { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiException } from '../../shared/api';

// ===== CONFIGURAÇÃO DO QUERY CLIENT =====

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache por 5 minutos por padrão
      staleTime: 5 * 60 * 1000,
      
      // Retry apenas em erros de rede
      retry: (failureCount, error) => {
        // Não retry em erros 4xx (cliente)
        if (error instanceof ApiException && error.status >= 400 && error.status < 500) {
          return false;
        }
        
        // Retry até 3 vezes em outros erros
        return failureCount < 3;
      },
      
      // Configurações de background
      refetchOnWindowFocus: false, // Não refetch ao focar janela
      refetchOnReconnect: true,    // Refetch ao reconectar internet
    },
    
    mutations: {
      // Retry apenas em erros de rede para mutations
      retry: (failureCount, error) => {
        if (error instanceof ApiException && error.status >= 400) {
          return false;
        }
        return failureCount < 1; // Só 1 retry para mutations
      },
    },
  },
});

// ===== PROVIDER COMPONENT =====

interface QueryProviderProps {
  children: ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

// ===== CONFIGURAÇÕES DE ERRO GLOBAIS =====

// Handler global para erros não tratados
queryClient.setMutationDefaults(['auth'], {
  onError: (error) => {
    if (error instanceof ApiException) {
      // Logout automático em erros 401 (não autorizado)
      if (error.status === 401) {
        queryClient.clear();
        localStorage.removeItem('viu_token');
        window.location.href = '/login';
      }
    }
  },
});

// ===== EXPORT DO CLIENT PARA USO DIRETO =====
export { queryClient };