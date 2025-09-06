// apps/web/src/hooks/useLocalStorage.ts
import { useState, useEffect } from 'react';

/**
 * A custom hook that syncs a `useState` variable with the browser's `localStorage`.
 * It persists state across page reloads.
 *
 * @template T The type of the value to be stored.
 * @param {string} key - The key to use for storing the value in localStorage.
 * @param {T} initialValue - The initial value to use if none is found in localStorage.
 * @returns {[T, (value: T) => void]} A stateful value and a function to update it, same as `useState`.
 * @example
 * const [name, setName] = useLocalStorage('username', 'Guest');
 */
export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
  // Get initial value from localStorage or use the provided initialValue.
  const [storedValue, setStoredValue] = useState<T>(() => {
    // Check if running on the server (e.g., SSR) where `window` is not available.
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  // Effect to update localStorage whenever the state changes.
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(storedValue));
      }
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue];
}