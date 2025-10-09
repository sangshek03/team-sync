import { useState, useCallback } from 'react';

interface ToastState {
  message: string;
  type: 'success' | 'error' | 'info';
}

export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
  }, []);

  const hideToast = useCallback(() => {
    setToast(null);
  }, []);

  return { toast, showToast, hideToast };
}
