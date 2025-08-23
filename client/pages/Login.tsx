/**
 * Página de Login
 * CRIAR NOVO ARQUIVO: client/pages/Login.tsx
 */

import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

// Hooks e utils
import { useAuth } from '../lib/auth-context';
import { ApiException } from '../../shared/api';

// UI Components (assumindo que você tem estes na pasta ui)
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';

// ===== SCHEMA DE VALIDAÇÃO =====

const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email é obrigatório')
    .email('Email inválido'),
  senha: z
    .string()
    .min(1, 'Senha é obrigatória')
    .min(6, 'Senha deve ter pelo menos 6 caracteres'),
});

type LoginFormData = z.infer<typeof loginSchema>;

// ===== COMPONENTE =====

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data.email, data.senha);
      
      toast.success('Login realizado com sucesso!');
      navigate('/dashboard');
      
    } catch (error) {
      console.error('Erro no login:', error);
      
      if (error instanceof ApiException) {
        if (error.status === 401) {
          toast.error('Email ou senha incorretos');
        } else if (error.status === 0) {
          toast.error('Erro de conexão. Verifique se o backend está rodando.');
        } else {
          toast.error(error.message || 'Erro no login');
        }
      } else {
        toast.error('Erro inesperado no login');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Entrar no VIU
          </CardTitle>
          <CardDescription className="text-center">
            Digite suas credenciais para acessar sua conta
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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

            {/* Botão de Submit */}
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Entrando...
                </>
              ) : (
                'Entrar'
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

          {/* Link para registro */}
          <div className="text-center">
            <p className="text-sm text-gray-600">
              Não tem uma conta?{' '}
              <Link 
                to="/register" 
                className="text-blue-600 hover:text-blue-500 font-medium"
              >
                Criar conta
              </Link>
            </p>
          </div>

          {/* Link para recuperar senha (futuro) */}
          <div className="text-center mt-4">
            <Link 
              to="/forgot-password" 
              className="text-sm text-gray-500 hover:text-gray-400"
            >
              Esqueceu sua senha?
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}