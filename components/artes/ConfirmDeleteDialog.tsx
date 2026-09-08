"use client";
import { buttonVariants } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, }
from "@/components/ui/alert-dialog";

export default function ConfirmDeleteDialog({
  open, onOpenChange, onConfirm, arteNome,
}: { open: boolean; onOpenChange: (v: boolean) => void; onConfirm: () => void; arteNome?: string | null; }) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir arte?</AlertDialogTitle>
          <AlertDialogDescription>
            Essa ação é permanente e removerá registros ligados (histórico de versões, feedbacks, aprovações).
            {arteNome ? <> Arte: <strong>{arteNome}</strong>.</> : null}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          {/*
            buttonVariants em vez das classes na mão: escritas a mão elas
            perdiam o `dark:bg-destructive/60` da variante, e no tema escuro
            o branco ficava em 3,4:1 sobre o vermelho sólido. Com a
            variante, a mistura com o fundo escuro sobe para 6,9:1.
          */}
          <AlertDialogAction
            onClick={onConfirm}
            className={buttonVariants({ variant: "destructive" })}
          >
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
