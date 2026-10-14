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
    <div className={cn("relative flex flex-wrap items-end justify-between gap-5 border-b border-border/60 pb-6", className)}>
      <div className="relative min-w-0 space-y-1.5 pl-4 before:absolute before:bottom-1 before:left-0 before:top-1 before:w-1 before:rounded-full before:bg-primary">
        <h1 className="font-display text-[clamp(1.5rem,2.4vw,2rem)] font-semibold leading-tight tracking-[-0.04em]">{title}</h1>
        {description && <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">{actions}</div>}
    </div>
  );
}
