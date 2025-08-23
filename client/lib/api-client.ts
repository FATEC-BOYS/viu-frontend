/**
 * Cliente HTTP para comunicação com a API
 * Usando fetch + React Query
 */

import { 
  API_BASE_URL, 
  API_ENDPOINTS, 
  ApiResponse, 
  ApiException,
  AuthResponse,
  Usuario,
  Projeto,
  Arte,
  CreateUsuarioDto,
  LoginDto,
  CreateProjetoDto,
  CreateArteDto,
  PaginatedResponse
} from '../../shared/api';

// ===== CONFIGURAÇÃO DO CLIENTE =====

class ApiClient {
  private baseURL: string;
  
  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  // Método privado para fazer requisições
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    // Headers padrão
    const defaultHeaders: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // Adicionar token JWT se existir
    const token = this.getToken();
    if (token) {
      defaultHeaders.Authorization = `Bearer ${token}`;
    }

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      
      // Se não for JSON (ex: upload de arquivo), retornar response direto
      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        if (!response.ok) {
          throw new ApiException(response.status, 'Erro na requisição');
        }
        return response as unknown as T;
      }

      const data: ApiResponse<T> = await response.json();

      if (!response.ok) {
        throw new ApiException(
          response.status,
          data.message || 'Erro na requisição',
          'API_ERROR'
        );
      }

      // Se a API retorna { success, data }, extrair apenas data
      if (data.success && data.data !== undefined) {
        return data.data;
      }

      // Senão, retornar o objeto completo
      return data as T;
      
    } catch (error) {
      if (error instanceof ApiException) {
        throw error;
      }
      
      // Erro de rede ou outro erro não esperado
      throw new ApiException(
        0,
        'Erro de conexão. Verifique sua internet.',
        'NETWORK_ERROR'
      );
    }
  }

  // Gerenciamento de token JWT
  private getToken(): string | null {
    return localStorage.getItem('viu_token');
  }

  public setToken(token: string): void {
    localStorage.setItem('viu_token', token);
  }

  public removeToken(): void {
    localStorage.removeItem('viu_token');
  }

  // ===== MÉTODOS DE AUTENTICAÇÃO =====

  async register(userData: CreateUsuarioDto): Promise<AuthResponse> {
    return this.request<AuthResponse>(API_ENDPOINTS.register, {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async login(credentials: LoginDto): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>(API_ENDPOINTS.login, {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    
    // Salvar token automaticamente
    if (response.token) {
      this.setToken(response.token);
    }
    
    return response;
  }

  async logout(): Promise<void> {
    try {
      await this.request(API_ENDPOINTS.logout, { method: 'POST' });
    } finally {
      // Sempre remover token local, mesmo se a API falhar
      this.removeToken();
    }
  }

  async getCurrentUser(): Promise<Usuario> {
    return this.request<Usuario>(API_ENDPOINTS.me);
  }

  // ===== MÉTODOS DE USUÁRIOS =====

  async getUsuarios(): Promise<Usuario[]> {
    return this.request<Usuario[]>(API_ENDPOINTS.usuarios);
  }

  async getUsuario(id: string): Promise<Usuario> {
    return this.request<Usuario>(`${API_ENDPOINTS.usuarios}/${id}`);
  }

  // ===== MÉTODOS DE PROJETOS =====

  async getProjetos(): Promise<Projeto[]> {
    return this.request<Projeto[]>(API_ENDPOINTS.projetos);
  }

  async getProjeto(id: string): Promise<Projeto> {
    return this.request<Projeto>(`${API_ENDPOINTS.projetos}/${id}`);
  }

  async createProjeto(projetoData: CreateProjetoDto): Promise<Projeto> {
    return this.request<Projeto>(API_ENDPOINTS.projetos, {
      method: 'POST',
      body: JSON.stringify(projetoData),
    });
  }

  async updateProjeto(id: string, projetoData: Partial<CreateProjetoDto>): Promise<Projeto> {
    return this.request<Projeto>(`${API_ENDPOINTS.projetos}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(projetoData),
    });
  }

  async deleteProjeto(id: string): Promise<void> {
    return this.request<void>(`${API_ENDPOINTS.projetos}/${id}`, {
      method: 'DELETE',
    });
  }

  // ===== MÉTODOS DE ARTES =====

  async getArtes(projetoId?: string): Promise<Arte[]> {
    const endpoint = projetoId 
      ? `${API_ENDPOINTS.artes}?projetoId=${projetoId}`
      : API_ENDPOINTS.artes;
    return this.request<Arte[]>(endpoint);
  }

  async getArte(id: string): Promise<Arte> {
    return this.request<Arte>(`${API_ENDPOINTS.artes}/${id}`);
  }

  async uploadArte(file: File, arteData: CreateArteDto): Promise<Arte> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('data', JSON.stringify(arteData));

    return this.request<Arte>(API_ENDPOINTS.upload, {
      method: 'POST',
      body: formData,
      headers: {}, // Não definir Content-Type para FormData
    });
  }

  // ===== MÉTODOS UTILITÁRIOS =====

  // Verificar se está autenticado
  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  // Método para testar conexão
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return this.request<{ status: string; timestamp: string }>('/health');
  }
}

// ===== INSTÂNCIA SINGLETON =====
export const apiClient = new ApiClient();

// ===== HOOKS DO REACT QUERY =====

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Query Keys para cache
export const QUERY_KEYS = {
  currentUser: ['currentUser'],
  usuarios: ['usuarios'],
  usuario: (id: string) => ['usuario', id],
  projetos: ['projetos'],
  projeto: (id: string) => ['projeto', id],
  artes: (projetoId?: string) => ['artes', projetoId],
  arte: (id: string) => ['arte', id],
} as const;

// Hook para usuário atual
export function useCurrentUser() {
  return useQuery({
    queryKey: QUERY_KEYS.currentUser,
    queryFn: () => apiClient.getCurrentUser(),
    enabled: apiClient.isAuthenticated(), // Só buscar se estiver logado
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

// Hook para lista de projetos
export function useProjetos() {
  return useQuery({
    queryKey: QUERY_KEYS.projetos,
    queryFn: () => apiClient.getProjetos(),
    staleTime: 2 * 60 * 1000, // 2 minutos
  });
}

// Hook para projeto específico
export function useProjeto(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.projeto(id),
    queryFn: () => apiClient.getProjeto(id),
    enabled: !!id,
  });
}

// Hook para login
export function useLogin() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (credentials: LoginDto) => apiClient.login(credentials),
    onSuccess: (data) => {
      // Invalidar cache do usuário atual para buscar novamente
      queryClient.setQueryData(QUERY_KEYS.currentUser, data.user);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.currentUser });
    },
  });
}

// Hook para registro
export function useRegister() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (userData: CreateUsuarioDto) => apiClient.register(userData),
    onSuccess: (data) => {
      // Fazer login automático após registro
      queryClient.setQueryData(QUERY_KEYS.currentUser, data.user);
    },
  });
}

// Hook para logout
export function useLogout() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: () => apiClient.logout(),
    onSuccess: () => {
      // Limpar todo o cache quando fizer logout
      queryClient.clear();
    },
  });
}