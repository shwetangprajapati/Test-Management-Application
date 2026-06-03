"use client";

import { create } from "zustand";

type ToastType = "success" | "error";

export type Toast = {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
};

type ToastState = {
  toasts: Toast[];
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  dismiss: (id: string) => void;
};

function makeToast(type: ToastType, title: string, message?: string): Toast {
  return {
    id: crypto.randomUUID(),
    type,
    title,
    message,
  };
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  success: (title, message) => {
    const toast = makeToast("success", title, message);
    set((state) => ({ toasts: [...state.toasts, toast] }));
    window.setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((item) => item.id !== toast.id) }));
    }, 4200);
  },
  error: (title, message) => {
    const toast = makeToast("error", title, message);
    set((state) => ({ toasts: [...state.toasts, toast] }));
    window.setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((item) => item.id !== toast.id) }));
    }, 5600);
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
}));
