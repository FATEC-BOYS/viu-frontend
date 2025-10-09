// components/ui/alert.tsx
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

// Se você já tem `cn` em "@/lib/utils", use de lá.
// Caso não tenha, descomente a função abaixo.
// export function cn(...classes: (string | undefined | null | false)[]) {
//   return classes.filter(Boolean).join(" ");
// }
import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative w-full rounded-lg border p-4 text-sm",
  {
    variants: {
      variant: {
        default:
          "bg-background text-foreground border-border " +
          // layout para ícone opcional (primeiro SVG dentro do alert)
          "[&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 " +
          "[&>svg~*]:pl-7 [&>svg+div]:translate-y-[-2px]",
        destructive:
          "border-destructive/50 text-destructive dark:border-destructive " +
          "[&>svg]:text-destructive",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant, ...props }, ref) => (
    <div
      ref={ref}
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  )
);
Alert.displayName = "Alert";

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 font-medium leading-none tracking-tight", className)}
    {...props}
  />
));
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-muted-foreground [&_p]:leading-relaxed", className)}
    {...props}
  />
));
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertTitle, AlertDescription };
