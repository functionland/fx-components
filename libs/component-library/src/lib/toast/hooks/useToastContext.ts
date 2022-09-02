import React from 'react';
import { ToastContext } from '../context';
import { IToastContext } from '../types.toast';

const useToastContext = (): IToastContext => {
  const context = React.useContext<IToastContext>(ToastContext);
  if (context === undefined) {
    throw new Error('useToastContext must be used within a ToastProvider');
  }
  return context;
};

export default useToastContext;
