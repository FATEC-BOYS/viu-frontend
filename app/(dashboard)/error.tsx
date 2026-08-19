'use client'

import ErroDeTela from '@/components/layout/ErroDeTela'

/**
 * Boundary das telas do dashboard.
 *
 * Fica abaixo do layout, então a sidebar e o cabeçalho sobrevivem ao erro e a
 * pessoa consegue sair para outra tela. Sem este arquivo, o boundary da raiz
 * assumia e engolia a navegação junto.
 */
export default function DashboardError(props: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <ErroDeTela {...props} origem="dashboard" />
}
