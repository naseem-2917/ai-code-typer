import { useEffect, useContext } from 'react';
import { AppContext } from '../context/AppContext';

export const useAccessKey = (
  key: string | undefined,
  callback: (() => void) | undefined | null,
  options: { disabled?: boolean } = {}
) => {
  const context = useContext(AppContext);

  useEffect(() => {
    if (!key || options.disabled || !callback) {
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === key.toLowerCase()) {
        e.preventDefault();
        callback();
        context?.hideAccessKeyMenu();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [key, callback, options.disabled, context]);
};
