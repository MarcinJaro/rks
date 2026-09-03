"use client";

import { ReactNode, useRef } from "react";

import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const sizeClasses = {
  sm: "max-w-lg",
  md: "max-w-2xl",
  lg: "max-w-4xl",
  xl: "max-w-6xl",
} as const;

export function AdminEditorDialog({
  open,
  onClose,
  title,
  description = "Uzupełnij pola i zapisz zmiany.",
  children,
  footer,
  busy = false,
  size = "md",
  bodyClassName,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer: ReactNode;
  busy?: boolean;
  size?: keyof typeof sizeClasses;
  bodyClassName?: string;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  return (
    <Dialog
      modal
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !busy) onClose();
      }}
    >
      <DialogContent
        ref={contentRef}
        aria-modal="true"
        className={sizeClasses[size]}
        closeDisabled={busy}
        aria-busy={busy || undefined}
        onOpenAutoFocus={(event) => {
          returnFocusRef.current =
            document.activeElement instanceof HTMLElement
              ? document.activeElement
              : null;
          event.preventDefault();
          requestAnimationFrame(() => {
            const firstControl = contentRef.current?.querySelector<HTMLElement>(
              '[data-dialog-autofocus], input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled])',
            );
            (firstControl ?? contentRef.current)?.focus();
          });
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          returnFocusRef.current?.focus();
        }}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogBody className={cn(bodyClassName)}>{children}</DialogBody>
        <DialogFooter>{footer}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
