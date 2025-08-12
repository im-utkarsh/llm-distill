// frontend/src/hooks/useCopyToClipboard.ts

import { useState, useCallback } from 'react';

export const useCopyToClipboard = (timeout = 1500) => {
  const [isCopied, setIsCopied] = useState(false);

  const copy = useCallback((text: string) => {
    if (isCopied) return;

    navigator.clipboard.writeText(text).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), timeout);
    });
  }, [isCopied, timeout]);

  return { isCopied, copy };
};