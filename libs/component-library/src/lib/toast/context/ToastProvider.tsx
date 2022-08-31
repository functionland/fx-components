import React, { useCallback, useRef, useState } from 'react';
import { Toast } from '../components/Toast';
import type { ToastProps, ToastProviderProps } from '../types.toast';
import { defaultContext, ToastContext } from './ToastContext';

const ToastProvider: React.FC<ToastProviderProps> = ({
  defaults,
  customToasts,
  renderToaster = true,
  children,
  ...rest
}) => {
  const toasts = useRef<ToastProps[]>([]);
  const [activeToast, setActiveToast] = useState<ToastProps | null>(null);
  const [isLastInQueue, setIsLastInQueue] = useState(false);

  const showToast = useCallback((toast: ToastProps) => {
    toasts.current.shift();
    toasts.current.unshift(toast);
    setActiveToast(toast);
  }, []);

  const queueToast = useCallback((toast: ToastProps) => {
    toasts.current.push(toast);
    if (toasts.current.length === 1) {
      setActiveToast(toast);
    }
  }, []);

  const hideToast = useCallback(() => {
    toasts.current.shift();
    if (toasts.current.length === 0) {
      setIsLastInQueue(toasts.current.length === 0);
    } else {
      setActiveToast(toasts.current?.[0]);
    }
  }, []);

  const clearToastQueue = useCallback(() => {
    toasts.current.length = 0; // safer than = [] as this preserves the reference issues
    setActiveToast(null);
    setIsLastInQueue(false);
  }, []);

  const value = {
    toasts: toasts.current,
    activeToast,
    showToast,
    queueToast,
    isLastInQueue,
    hideToast,
    clearToastQueue,
    defaults: {
      ...defaultContext.defaults,
      ...defaults,
    },
    customToasts,
  };

  return (
    <ToastContext.Provider value={value} {...rest}>
      {children}
      {renderToaster && <Toast />}
    </ToastContext.Provider>
  );
};

export { ToastProvider };
