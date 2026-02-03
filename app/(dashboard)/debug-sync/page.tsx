'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { syncUserWithBackend } from '@/lib/syncWithBackend';
import { Button } from '@/components/ui/button';

export default function DebugSyncPage() {
  const { user, profile } = useAuth();
  const [supabaseUser, setSupabaseUser] = useState<any>(null);
  const [usuariosTable, setUsuariosTable] = useState<any>(null);
  const [prismaUserId, setPrismaUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    checkAccess();
  }, [user]);

  useEffect(() => {
    if (hasAccess) {
      loadData();
    }
  }, [hasAccess, user]);

  const checkAccess = async () => {
    if (!user) {
      setHasAccess(false);
      setLoading(false);
      return;
    }

    // Verificar se está em desenvolvimento
    const isDev = process.env.NODE_ENV === 'development';

    if (isDev) {
      setHasAccess(true);
      return;
    }

    // Em produção, verificar via API
    try {
      const response = await fetch('/api/check-debug-access');
      const data = await response.json();
      setHasAccess(data.hasAccess);
    } catch (error) {
      console.error('Erro ao verificar acesso:', error);
      setHasAccess(false);
    } finally {
      setLoading(false);
    }
  };

  const loadData = async () => {
    setLoading(true);

    // 1. Usuário do Auth Context
    if (user) {
      setSupabaseUser({
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        confirmed_at: user.confirmed_at,
        user_metadata: user.user_metadata,
        app_metadata: user.app_metadata,
      });

      // 2. Verificar tabela usuario_auth (vinculada ao Supabase Auth)
      const { data, error } = await supabase
        .from('usuario_auth')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      setUsuariosTable(error ? { error: error.message } : data);

      // 3. Verificar localStorage
      const storedId = localStorage.getItem('prismaUserId');
      setPrismaUserId(storedId);
    }

    setLoading(false);
  };

  const handleSync = async () => {
    if (!user) return;

    setSyncing(true);
    setSyncResult(null);

    try {
      // Usar o novo endpoint que faz sincronização completa
      const response = await fetch('/api/sync-current-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });

      const result = await response.json();
      setSyncResult(result);

      // Recarregar dados
      await loadData();

      if (result.success) {
        alert('✅ Sincronização concluída com sucesso!');
      } else {
        alert(`❌ Erro na sincronização: ${result.error}`);
      }
    } catch (error) {
      console.error('Erro ao sincronizar:', error);
      setSyncResult({ error: String(error) });
      alert(`❌ Erro: ${error}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleApiTest = async () => {
    if (!user) return;

    setSyncing(true);
    setSyncResult(null);

    try {
      const response = await fetch(`/api/sync-test?userId=${user.id}`);
      const data = await response.json();
      setSyncResult(data);

      // Recarregar dados
      await loadData();

      console.log('🧪 Resultado do teste via API:', data);
    } catch (error) {
      console.error('Erro ao testar via API:', error);
      setSyncResult({ error: String(error) });
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <p>Carregando...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-8">
        <p className="text-red-500">Você precisa estar logado!</p>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <div className="border-l-4 border-red-500 bg-red-50 dark:bg-red-900/20 p-6 rounded">
          <h2 className="text-2xl font-bold text-red-700 dark:text-red-400 mb-2">
            🔒 Acesso Negado
          </h2>
          <p className="text-red-600 dark:text-red-300 mb-4">
            Esta página é restrita a administradores do sistema.
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Se você precisa acessar esta funcionalidade, entre em contato com o administrador.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">🔧 Debug: Sincronização de Usuário</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Status Cards */}
        <div className="border rounded-lg p-4 bg-white dark:bg-gray-800">
          <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
            {supabaseUser ? '✅' : '❌'} Supabase Auth
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            Usuário autenticado no Supabase Auth
          </p>
          {supabaseUser ? (
            <div className="text-xs bg-green-50 dark:bg-green-900/20 p-2 rounded">
              <p><strong>ID:</strong> {supabaseUser.id}</p>
              <p><strong>Email:</strong> {supabaseUser.email}</p>
              <p><strong>Confirmado:</strong> {supabaseUser.confirmed_at ? 'Sim' : 'Não'}</p>
            </div>
          ) : (
            <p className="text-red-500">Não autenticado</p>
          )}
        </div>

        <div className="border rounded-lg p-4 bg-white dark:bg-gray-800">
          <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
            {usuariosTable && !usuariosTable.error ? '✅' : '❌'} Tabela usuario_auth
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            Registro na tabela usuarios do Supabase
          </p>
          {usuariosTable ? (
            usuariosTable.error ? (
              <p className="text-red-500 text-xs">{usuariosTable.error}</p>
            ) : (
              <div className="text-xs bg-green-50 dark:bg-green-900/20 p-2 rounded">
                <p><strong>Nome:</strong> {usuariosTable.nome}</p>
                <p><strong>Tipo:</strong> {usuariosTable.tipo}</p>
                <p><strong>Ativo:</strong> {usuariosTable.ativo ? 'Sim' : 'Não'}</p>
              </div>
            )
          ) : (
            <p className="text-red-500">Não encontrado</p>
          )}
        </div>

        <div className="border rounded-lg p-4 bg-white dark:bg-gray-800">
          <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
            {prismaUserId ? '✅' : '❌'} Backend (Prisma)
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            ID salvo no localStorage após sincronização
          </p>
          {prismaUserId ? (
            <div className="text-xs bg-green-50 dark:bg-green-900/20 p-2 rounded">
              <p><strong>Prisma User ID:</strong> {prismaUserId}</p>
            </div>
          ) : (
            <p className="text-yellow-600 dark:text-yellow-400 text-xs">
              Não sincronizado ainda
            </p>
          )}
        </div>

        <div className="border rounded-lg p-4 bg-white dark:bg-gray-800">
          <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
            {profile ? '✅' : '❌'} AuthContext Profile
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            Perfil carregado no contexto global
          </p>
          {profile ? (
            <div className="text-xs bg-green-50 dark:bg-green-900/20 p-2 rounded">
              <p><strong>Nome:</strong> {profile.nome}</p>
              <p><strong>Tipo:</strong> {profile.tipo}</p>
            </div>
          ) : (
            <p className="text-yellow-600 dark:text-yellow-400 text-xs">
              Não carregado
            </p>
          )}
        </div>
      </div>

      {/* Ações */}
      <div className="border rounded-lg p-6 bg-white dark:bg-gray-800 mb-6">
        <h3 className="font-bold text-lg mb-4">🚀 Ações</h3>

        <div className="flex gap-3 flex-wrap">
          <Button
            onClick={handleSync}
            disabled={syncing}
            variant="default"
          >
            {syncing ? '🔄 Sincronizando...' : '🔄 Sincronizar com Backend'}
          </Button>

          <Button
            onClick={handleApiTest}
            disabled={syncing}
            variant="secondary"
          >
            {syncing ? '🧪 Testando...' : '🧪 Testar via API'}
          </Button>

          <Button
            onClick={loadData}
            disabled={loading}
            variant="outline"
          >
            🔃 Recarregar Dados
          </Button>
        </div>

        <p className="text-xs text-gray-500 mt-3">
          💡 Abra o DevTools (F12) → Console para ver logs detalhados
        </p>
      </div>

      {/* Resultado da Sincronização */}
      {syncResult && (
        <div className="border rounded-lg p-6 bg-white dark:bg-gray-800 mb-6">
          <h3 className="font-bold text-lg mb-4">
            {syncResult.success ? '✅ Resultado da Sincronização' : '❌ Erro na Sincronização'}
          </h3>
          <pre className="text-xs bg-gray-100 dark:bg-gray-900 p-4 rounded overflow-auto max-h-96">
            {JSON.stringify(syncResult, null, 2)}
          </pre>
        </div>
      )}

      {/* Dados Completos */}
      <details className="border rounded-lg p-6 bg-white dark:bg-gray-800">
        <summary className="font-bold cursor-pointer mb-4">
          🔍 Ver Dados Completos (JSON)
        </summary>

        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Supabase Auth User:</h4>
            <pre className="text-xs bg-gray-100 dark:bg-gray-900 p-4 rounded overflow-auto max-h-60">
              {JSON.stringify(supabaseUser, null, 2)}
            </pre>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Tabela usuario_auth:</h4>
            <pre className="text-xs bg-gray-100 dark:bg-gray-900 p-4 rounded overflow-auto max-h-60">
              {JSON.stringify(usuariosTable, null, 2)}
            </pre>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Profile (AuthContext):</h4>
            <pre className="text-xs bg-gray-100 dark:bg-gray-900 p-4 rounded overflow-auto max-h-60">
              {JSON.stringify(profile, null, 2)}
            </pre>
          </div>
        </div>
      </details>

      {/* Instruções */}
      <div className="mt-6 border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-900/20 p-4">
        <h4 className="font-bold mb-2">📋 Como usar:</h4>
        <ol className="text-sm space-y-1 list-decimal list-inside">
          <li>Verifique se todos os cards mostram ✅</li>
          <li>Se "Backend (Prisma)" mostrar ❌, clique em "Sincronizar com Backend"</li>
          <li>Verifique o console do navegador (F12) para logs detalhados</li>
          <li>Se houver erros, copie o JSON e compartilhe com o desenvolvedor</li>
        </ol>
      </div>
    </div>
  );
}
