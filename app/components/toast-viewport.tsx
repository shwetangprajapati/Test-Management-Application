"use client";

import { useToastStore } from "../store/useToastStore";

export function ToastViewport() {
  const toasts = useToastStore((state) => state.toasts);
  const dismiss = useToastStore((state) => state.dismiss);

  return (
    <div className="pr-toast-viewport" aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => (
        <section key={toast.id} className={`pr-toast pr-toast-${toast.type}`}>
          <span className="pr-toast-icon" aria-hidden="true" />
          <div>
            <strong>{toast.title}</strong>
            {toast.message ? <p>{toast.message}</p> : null}
          </div>
          <button type="button" aria-label="Dismiss notification" onClick={() => dismiss(toast.id)}>
            x
          </button>
        </section>
      ))}
    </div>
  );
}
