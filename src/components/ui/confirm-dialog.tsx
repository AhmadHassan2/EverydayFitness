"use client";

import { AlertDialog } from "radix-ui";
import { buttonVariants } from "./button";
import { cn } from "@/lib/utils";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  destructive = true,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-[60] bg-black/40 animate-fade-in" />
        <AlertDialog.Content className="fixed left-1/2 top-1/2 z-[60] w-[calc(100%-32px)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-surface p-5 shadow-xl animate-fade-in focus:outline-none">
          <AlertDialog.Title className="text-[17px] font-semibold">{title}</AlertDialog.Title>
          {description ? (
            <AlertDialog.Description className="mt-1.5 text-[15px] text-muted-foreground">{description}</AlertDialog.Description>
          ) : null}
          <div className="mt-5 grid grid-cols-2 gap-2">
            <AlertDialog.Cancel className={cn(buttonVariants({ variant: "secondary" }))}>{cancelLabel}</AlertDialog.Cancel>
            <AlertDialog.Action
              className={cn(buttonVariants({ variant: destructive ? "destructive" : "primary" }))}
              onClick={onConfirm}
            >
              {confirmLabel}
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
