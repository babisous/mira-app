"use client";

/**
 * Panel coulissant réutilisable
 * Desktop: sidebar à droite
 * Mobile: bottom sheet
 */

import { useState, useEffect, useCallback } from "react";
import { X, ArrowLeft } from "lucide-react";

export default function SlidePanel({
  isOpen,
  onClose,
  onBack,
  title,
  children,
  showCloseButton = true
}) {
  const [isClosing, setIsClosing] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      setIsClosing(false);
    } else if (shouldRender) {
      setIsClosing(true);
      const timer = setTimeout(() => {
        setShouldRender(false);
        setIsClosing(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, shouldRender]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  if (!shouldRender) return null;

  return (
    <div className={`slide-panel ${isClosing ? "slide-panel--closing" : ""}`}>
      <div className="slide-panel__header">
        <div className="slide-panel__title-wrapper">
          {onBack && (
            <button
              className="slide-panel__back"
              onClick={onBack}
              aria-label="Retour"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <h2 className="slide-panel__title">{title}</h2>
        </div>
        {showCloseButton && (
          <button
            className="slide-panel__close"
            onClick={handleClose}
            aria-label="Fermer"
          >
            <X size={24} />
          </button>
        )}
      </div>
      <div className="slide-panel__content">
        {children}
      </div>
    </div>
  );
}
