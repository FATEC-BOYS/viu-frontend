'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { syncUserWithBackend } from '@/lib/syncWithBackend';
import { Button } from '@/components/ui/button';

export function SyncTestButton() {
  const { user } = useAuth();
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleSync = async () => {
    if (!user) {
      alert('Você precisa estar logado!');
      return;
    }

    setTesting(true);
    setResult(null);

    try {
      console.log('🧪 Testando sincronização manual...', user);
      const response = await syncUserWithBackend(user);
      setResult(response);

      if (response.success) {
        alert('✅ Sincronização bem-sucedida! Verifique o console.');
      } else {
        alert(`❌ Falha: ${response.error}`);
      }
    } catch (error) {
      console.error('Erro ao testar sincronização:', error);
      setResult({ error: String(error) });
      alert(`❌ Erro: ${error}`);
    } finally {
      setTesting(false);
    }
  };

  const handleApiTest = async () => {
    if (!user) {
      alert('Você precisa estar logado!');
      return;
    }

    setTesting(true);
    setResult(null);

    try {
      const response = await fetch(`/api/sync-test?userId=${user.id}`);
      const data = await response.json();
      setResult(data);

      console.log('🧪 Resultado do teste via API:', data);

      if (data.success) {
        alert('✅ Teste via API bem-sucedido! Verifique o console.');
      } else {
        alert(`❌ Falha via API: ${data.error || 'Erro desconhecido'}`);
      }
    } catch (error) {
      console.error('Erro ao testar via API:', error);
      setResult({ error: String(error) });
      alert(`❌ Erro: ${error}`);
    } finally {
      setTesting(false);
    }
  };

  if (!user) return null;

  return (
    <div className="fixed bottom-4 right-4 p-4 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-lg max-w-md">
      <h3 className="text-sm font-bold mb-2">🔧 Debug: Sincronização Backend</h3>
      <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
        User ID: <code className="bg-gray-100 dark:bg-gray-900 px-1 rounded">{user.id}</code>
      </p>

      <div className="flex gap-2 mb-2">
        <Button
          onClick={handleSync}
          disabled={testing}
          size="sm"
          variant="default"
        >
          {testing ? '🔄 Testando...' : '🚀 Sync Direto'}
        </Button>

        <Button
          onClick={handleApiTest}
          disabled={testing}
          size="sm"
          variant="secondary"
        >
          {testing ? '🔄 Testando...' : '🧪 Sync via API'}
        </Button>
      </div>

      {result && (
        <pre className="text-xs bg-gray-100 dark:bg-gray-900 p-2 rounded mt-2 overflow-auto max-h-40">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}

      <p className="text-xs text-gray-500 mt-2">
        Abra o DevTools (F12) → Console para ver logs detalhados
      </p>
    </div>
  );
}
