export const dynamic = 'force-dynamic'; // força render dinâmico
export const revalidate = 0;            // não revalida (sem SSG)
export const fetchCache = 'default-no-store';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}