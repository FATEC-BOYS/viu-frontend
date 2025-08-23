/**
 * Shared code between client and server
 * Types baseados no schema Prisma e cliente API
 */

// ===== TIPOS BASEADOS NO PRISMA SCHEMA =====

export interface Usuario {
  id: string;
  email: string;
  nome: string;
  telefone?: string;
  avatar?: string;
  tipo: 'DESIGNER' | 'CLIENTE';
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
}

export interface Projeto {
  id: string;
  nome: string;
  descricao?: string;
  status: 'EM_ANDAMENTO' | 'CONCLUIDO' | 'PAUSADO' | 'CANCELADO';
  orcamento?: number; // Em centavos
  prazo?: string;
  designerId: string;
  designer: Usuario;
  clienteId: string;
  cliente: Usuario;
  artes?: Arte[];
  tarefas?: Tarefa[];
  criadoEm: string;
  atualizadoEm: string;
}

export interface Arte {
  id: string;
  nome: string;
  descricao?: string;
  arquivo: string; // URL/path do arquivo
  tipo: 'IMAGEM' | 'VIDEO' | 'DOCUMENTO' | 'AUDIO';
  tamanho: number; // Em bytes
  versao: number;
  status: 'EM_ANALISE' | 'APROVADO' | 'REJEITADO' | 'REVISAO';
  projetoId: string;
  projeto?: Projeto;
  autorId: string;
  autor: Usuario;
  feedbacks?: Feedback[];
  aprovacoes?: Aprovacao[];
  criadoEm: string;
  atualizadoEm: string;
}

export interface Feedback {
  id: string;
  conteudo: string;
  tipo: 'TEXTO' | 'AUDIO' | 'POSICIONAL';
  arquivo?: string; // Para feedback de áudio
  posicaoX?: number; // Para feedback posicional
  posicaoY?: number;
  arteId: string;
  arte?: Arte;
  autorId: string;
  autor: Usuario;
  criadoEm: string;
}

export interface Aprovacao {
  id: string;
  status: 'PENDENTE' | 'APROVADO' | 'REJEITADO';
  comentario?: string;
  arteId: string;
  arte?: Arte;
  aprovadorId: string;
  aprovador: Usuario;
  criadoEm: string;
}

export interface Tarefa {
  id: string;
  titulo: string;
  descricao?: string;
  status: 'PENDENTE' | 'EM_ANDAMENTO' | 'CONCLUIDA' | 'CANCELADA';
  prioridade: 'BAIXA' | 'MEDIA' | 'ALTA' | 'URGENTE';
  prazo?: string;
  projetoId?: string;
  projeto?: Projeto;
  responsavelId: string;
  responsavel: Usuario;
  criadoEm: string;
  atualizadoEm: string;
}

export interface Notificacao {
  id: string;
  titulo: string;
  conteudo: string;
  tipo: 'INFO' | 'SUCESSO' | 'AVISO' | 'ERRO';
  canal: 'SISTEMA' | 'EMAIL' | 'SMS' | 'PUSH';
  lida: boolean;
  usuarioId: string;
  usuario?: Usuario;
  criadoEm: string;
}

// ===== DTOs PARA REQUISIÇÕES =====

export interface CreateUsuarioDto {
  email: string;
  senha: string;
  nome: string;
  telefone?: string;
  tipo: 'DESIGNER' | 'CLIENTE';
}

export interface LoginDto {
  email: string;
  senha: string;
}

export interface CreateProjetoDto {
  nome: string;
  descricao?: string;
  clienteId: string;
  orcamento?: number;
  prazo?: string;
}

export interface CreateArteDto {
  nome: string;
  descricao?: string;
  projetoId: string;
  tipo: 'IMAGEM' | 'VIDEO' | 'DOCUMENTO' | 'AUDIO';
}

export interface CreateFeedbackDto {
  conteudo: string;
  tipo: 'TEXTO' | 'AUDIO' | 'POSICIONAL';
  arteId: string;
  posicaoX?: number;
  posicaoY?: number;
}

// ===== RESPONSES DA API =====

export interface AuthResponse {
  user: Usuario;
  token: string;
  expiresIn: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ===== CONFIGURAÇÃO DA API =====

export const API_BASE_URL = 'http://localhost:3001';

export const API_ENDPOINTS = {
  // Auth
  register: '/auth/register',
  login: '/auth/login',
  logout: '/auth/logout',
  me: '/auth/me',
  
  // Usuarios
  usuarios: '/usuarios',
  
  // Projetos
  projetos: '/projetos',
  
  // Artes
  artes: '/artes',
  upload: '/upload',
  
  // Feedbacks
  feedbacks: '/feedbacks',
  
  // Aprovacoes
  aprovacoes: '/aprovacoes',
  
  // Tarefas
  tarefas: '/tarefas',
  
  // Notificacoes
  notificacoes: '/notificacoes',
} as const;

// ===== TIPOS DE ERRO =====

export interface ApiError {
  message: string;
  status: number;
  code?: string;
}

export class ApiException extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiException';
  }
}

// ===== EXAMPLE RESPONSE TYPE (manter para compatibilidade) =====
export interface DemoResponse {
  message: string;
}