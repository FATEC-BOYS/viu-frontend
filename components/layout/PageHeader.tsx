import { cn } from "@/lib/utils";

/**
 * Cabeçalho padrão das telas.
 *
 * O título variava entre text-2xl, 3xl e 4xl, bold e semibold, com e sem
 * tracking-tight — cada tela tinha um peso diferente, e a hierarquia mudava
 * conforme a navegação. Aqui é um só.
 *
 * Sem animação própria: a tela inteira já entra com <FadeIn>, e um segundo
 * movimento aninhado no cabeçalho fazia o título deslizar por cima do resto.
 *
 * `actions` fica à direita e quebra para baixo no mobile.
 */
export default function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-4", className)}>
      <div className="min-w-0 space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
