"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  size?: "small" | "medium" | "large";
  closeOnOverlayClick?: boolean;
}

export function Modal({ isOpen, onClose, children, title, size = "medium", closeOnOverlayClick = true }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    small: "pr-modal-small",
    medium: "pr-modal-medium",
    large: "pr-modal-large"
  };

  const modalContent = (
    <div className="pr-modal-overlay" onClick={closeOnOverlayClick ? onClose : undefined}>
      <div
        ref={modalRef}
        className={`pr-modal ${sizeClasses[size]}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pr-modal-header">
          {title && <h2 className="pr-modal-title">{title}</h2>}
          <button
            type="button"
            className="pr-modal-close"
            onClick={onClose}
            aria-label="Close modal"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
        <div className="pr-modal-body">
          {children}
        </div>
      </div>
    </div>
  );

  return typeof window !== "undefined" ? createPortal(modalContent, document.body) : null;
}

export default Modal;