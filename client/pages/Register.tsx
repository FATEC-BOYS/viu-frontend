/**
 * Página de Registro
 * CRIAR NOVO ARQUIVO: client/pages/Register.tsx
 */

import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

// Hooks e utils
import { useRegister } from '../lib/api-client';
import { ApiException } from '../../shared/api';

// UI Components
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';

// ===== SCHEMA DE VALIDAÇÃO =====

const registerSchema = z.object({
  nome: z
    .string()
    .min(1, 'Nome é obrigatório')
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome muito longo'),
  email: z
    .string()
    .min(1, 'Email é obrigatório')
    .email('Email inválido'),
  senha: z
    .string()
    .min(1, 'Senha é obrigatória')
    .min(6, 'Senha deve ter pelo menos 6 caracteres')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Senha deve ter ao menos: 1 minúscula, 1 maiúscula e 1 número'),
  confirmarSenha: z
    .string()
    .min(1, 'Confirmação de senha é obrigatória'),
  tipo: z
    .enum(['DESIGNER', 'CLIENTE'], {
      required_error: 'Tipo de usuário é obrigatório',
    }),
  telefone: z
    .string()
    .optional()
    .refine((phone) => !phone || phone.length >= 10, 'Telefone deve ter pelo menos 10 dígitos'),
}).refine((data) => data.senha === data.confirmarSenha, {
  message: 'Senhas não coincidem',
  path: ['confirmarSenha'],
});

type RegisterFormData = z.infer<typeof registerSchema>;

// ===== COMPONENTE =====

export default function Register() {
  const navigate = useNavigate();
  const registerMutation = useRegister();
  
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    try {
      const { confirmarSenha, ...userData } = data;
      
      await registerMutation.mutateAsync(userData);
      
      toast.success('Conta criada com sucesso! Redirecionando...');
      
      // Aguardar um pouco antes de redirecionar para mostrar o toast
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
      
    } catch (error) {
      console.error('Erro no registro:', error);
      
      if (error instanceof ApiException) {
        if (error.status === 409) {
          toast.error('Este email já está em uso');
        } else if (error.status === 0) {
          toast.error('Erro de conexão. Verifique se o backend está rodando.');
        } else {
          toast.error(error.message || 'Erro ao criar conta');
        }
      } else {
        toast.error('Erro inesperado ao criar conta');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Criar Conta no VIU
          </CardTitle>
          <CardDescription className="text-center">
            Preencha os dados para criar sua conta
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Nome */}
            <div className="space-y-2">
              <Label htmlFor="nome">Nome Completo</Label>
              <Input
                id="nome"
                type="text"
                placeholder="Seu nome completo"
                {...register('nome')}
                className={errors.nome ? 'border-red-500' : ''}
              />
              {errors.nome && (
                <p className="text-sm text-red-500">{errors.nome.message}</p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                {...register('email')}
                className={errors.email ? 'border-red-500' : ''}
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>

            {/* Tipo de Usuário */}
            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo de Usuário</Label>
              <Select onValueChange={(value) => setValue('tipo', value as 'DESIGNER' | 'CLIENTE')}>
                <SelectTrigger className={errors.tipo ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Selecione seu tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DESIGNER">
                    <div>
                      <div className="font-medium">Designer</div>
                      <div className="text-sm text-gray-500">Cria e gerencia projetos</div>
                    </div>
                  </SelectItem>
                  <SelectItem value="CLIENTE">
                    <div>
                      <div className="font-medium">Cliente</div>
                      <div className="text-sm text-gray-500">Solicita e aprova projetos</div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              {errors.tipo && (
                <p className="text-sm text-red-500">{errors.tipo.message}</p>
              )}
            </div>

            {/* Telefone (opcional) */}
            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone (opcional)</Label>
              <Input
                id="telefone"
                type="tel"
                placeholder="(11) 99999-9999"
                {...register('telefone')}
                className={errors.telefone ? 'border-red-500' : ''}
              />
              {errors.telefone && (
                <p className="text-sm text-red-500">{errors.telefone.message}</p>
              )}
            </div>

            {/* Senha */}
            <div className="space-y-2">
              <Label htmlFor="senha">Senha</Label>
              <Input
                id="senha"
                type="password"
                placeholder="••••••••"
                {...register('senha')}
                className={errors.senha ? 'border-red-500' : ''}
              />
              {errors.senha && (
                <p className="text-sm text-red-500">{errors.senha.message}</p>
              )}
            </div>

            {/* Confirmar Senha */}
            <div className="space-y-2">
              <Label htmlFor="confirmarSenha">Confirmar Senha</Label>
              <Input
                id="confirmarSenha"
                type="password"
                placeholder="••••••••"
                {...register('confirmarSenha')}
                className={errors.confirmarSenha ? 'border-red-500' : ''}
              />
              {errors.confirmarSenha && (
                <p className="text-sm text-red-500">{errors.confirmarSenha.message}</p>
              )}
            </div>

            {/* Botão de Submit */}
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Criando conta...
                </>
              ) : (
                'Criar Conta'
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-500">
                Ou
              </span>
            </div>
          </div>

          {/* Link para login */}
          <div className="text-center">
            <p className="text-sm text-gray-600">
              Já tem uma conta?{' '}
              <Link 
                to="/login" 
                className="text-blue-600 hover:text-blue-500 font-medium"
              >
                Fazer login
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}