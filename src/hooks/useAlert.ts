// src/hooks/useAlert.ts
"use client";

import { useState, useCallback } from 'react';
import { ALERT_AUTO_DISMISS_TIMEOUT } from '@/constants/ui';

export interface AlertState {
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message?: string;
}

export interface UseAlertReturn {
  alert: AlertState | null;
  showAlert: (type: AlertState['type'], title: string, message?: string) => void;
  hideAlert: () => void;
}

export function useAlert(): UseAlertReturn {
  const [alert, setAlert] = useState<AlertState | null>(null);

  const showAlert = useCallback((
    type: AlertState['type'], 
    title: string, 
    message?: string
  ) => {
    setAlert({ type, title, message });
    
    // Auto-dismiss after timeout
    setTimeout(() => {
      setAlert(null);
    }, ALERT_AUTO_DISMISS_TIMEOUT);
  }, []);

  const hideAlert = useCallback(() => {
    setAlert(null);
  }, []);

  return {
    alert,
    showAlert,
    hideAlert
  };
}