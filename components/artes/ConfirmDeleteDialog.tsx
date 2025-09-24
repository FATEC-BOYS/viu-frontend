"use client";
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
          <AlertDialogAction onClick={onConfirm} className="bg-destructive text-white hover:bg-destructive/90">
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
