"use client";

import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider as RadixToastProvider,
  ToastTitle,
  ToastViewport,
} from "./toast";
import { ToastStoreProvider, useToast } from "./use-toast";

function ToastList() {
  const { toasts, dismiss } = useToast();
  return (
    <>
      {toasts.map((t) => (
        <Toast
          key={t.id}
          variant={t.variant}
          duration={t.variant === "danger" ? Infinity : 4000}
          onOpenChange={(open) => !open && dismiss(t.id)}
        >
          <div className="flex-1 space-y-0.5">
            <ToastTitle>{t.title}</ToastTitle>
            {t.description ? <ToastDescription>{t.description}</ToastDescription> : null}
          </div>
          <ToastClose />
        </Toast>
      ))}
      <ToastViewport />
    </>
  );
}

/**
 * Wrap the app so children can call `useToast()`.
 * The visual viewport (ToastList) is rendered inside the same provider
 * tree so toasts appear without an extra mount point.
 */
export function Toaster({ children }: { children: React.ReactNode }) {
  return (
    <ToastStoreProvider>
      <RadixToastProvider swipeDirection="right">
        {children}
        <ToastList />
      </RadixToastProvider>
    </ToastStoreProvider>
  );
}
