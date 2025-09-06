// apps/web/src/hooks/useCopyToClipboard.ts
import { useState, useCallback } from 'react';

/**
 * A custom hook to provide "copy to clipboard" functionality.
 *
 * @param {number} [timeout=1500] - The time in milliseconds to show the "copied" state.
 * @returns {{ isCopied: boolean, copy: (text: string) => void }} An object containing the copied state and the copy function.
 * @example
 * const { isCopied, copy } = useCopyToClipboard();
 * <button onClick={() => copy("text to copy")}>
 * {isCopied ? 'Copied!' : 'Copy'}
 * </button>
 */
export const useCopyToClipboard = (timeout = 1500) => {
  const [isCopied, setIsCopied] = useState(false);

  const copy = useCallback((text: string) => {
    // Prevent re-copying if already in "copied" state.
    if (isCopied) return;

    navigator.clipboard.writeText(text).then(() => {
      setIsCopied(true);
      // Reset the copied state after the timeout.
      setTimeout(() => setIsCopied(false), timeout);
    });
  }, [isCopied, timeout]);

  return { isCopied, copy };
};