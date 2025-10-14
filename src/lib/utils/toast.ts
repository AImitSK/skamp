import toast, { Toaster } from 'react-hot-toast';

/**
 * Zentraler Toast-Service für konsistente Benachrichtigungen
 *
 * Basiert auf react-hot-toast mit CeleroPress Design System
 * Layout: [Icon] Meldung - kompakt in einer Zeile
 */

// Basis-Styling für alle Toasts (kompakt, eine Zeile)
const baseStyle = {
  maxWidth: '500px',
  fontSize: '14px',
  padding: '12px 16px',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  whiteSpace: 'nowrap' as const,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

export const toastService = {
  /**
   * Success Toast - Kompakt in einer Zeile
   * @param message Hauptnachricht
   */
  success: (message: string) => {
    return toast.success(message, {
      duration: 3000,
      position: 'top-right',
      style: {
        ...baseStyle,
        background: '#f0fdf4', // green-50
        border: '1px solid #86efac', // green-300
        color: '#166534', // green-800
      },
      iconTheme: {
        primary: '#16a34a', // green-600
        secondary: '#f0fdf4',
      },
    });
  },

  /**
   * Error Toast - Kompakt in einer Zeile
   * @param message Fehlermeldung
   */
  error: (message: string) => {
    return toast.error(message, {
      duration: 5000, // Länger für Fehler
      position: 'top-right',
      style: {
        ...baseStyle,
        background: '#fef2f2', // red-50
        border: '1px solid #fca5a5', // red-300
        color: '#991b1b', // red-800
      },
      iconTheme: {
        primary: '#dc2626', // red-600
        secondary: '#fef2f2',
      },
    });
  },

  /**
   * Info Toast - Kompakt in einer Zeile
   * @param message Info-Nachricht
   */
  info: (message: string) => {
    return toast(message, {
      duration: 4000,
      position: 'top-right',
      icon: 'ℹ️',
      style: {
        ...baseStyle,
        background: '#eff6ff', // blue-50
        border: '1px solid #93c5fd', // blue-300
        color: '#1e40af', // blue-800
      },
    });
  },

  /**
   * Warning Toast - Kompakt in einer Zeile
   * @param message Warnung
   */
  warning: (message: string) => {
    return toast(message, {
      duration: 4000,
      position: 'top-right',
      icon: '⚠️',
      style: {
        ...baseStyle,
        background: '#fefce8', // yellow-50
        border: '1px solid #fde047', // yellow-300
        color: '#854d0e', // yellow-900
      },
    });
  },

  /**
   * Loading Toast - Kompakt in einer Zeile
   * @param message Loading-Text
   * @returns Toast-ID (für dismiss)
   */
  loading: (message: string) => {
    return toast.loading(message, {
      position: 'top-right',
      style: {
        ...baseStyle,
        background: '#f4f4f5', // zinc-100
        border: '1px solid #d4d4d8', // zinc-300
        color: '#18181b', // zinc-900
      },
    });
  },

  /**
   * Promise Toast
   * Zeigt Loading → Success/Error automatisch
   */
  promise: <T,>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string;
      error: string;
    }
  ) => {
    return toast.promise(promise, messages, {
      position: 'top-right',
    });
  },

  /**
   * Toast schließen
   * @param toastId Optional: Spezifische Toast-ID
   */
  dismiss: (toastId?: string) => {
    toast.dismiss(toastId);
  },

  /**
   * Alle Toasts schließen
   */
  dismissAll: () => {
    toast.dismiss();
  },
};

// Re-export Toaster Component für Layout
export { Toaster } from 'react-hot-toast';
