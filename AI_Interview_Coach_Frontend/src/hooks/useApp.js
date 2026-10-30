import { useState, useEffect } from 'react';

/**
 * useLocalStorage – persists state in localStorage
 */
export function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`useLocalStorage read error for key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = (value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.warn(`useLocalStorage write error for key "${key}":`, error);
    }
  };

  return [storedValue, setValue];
}

/**
 * useMediaQuery – responsive breakpoint detection
 */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);

    const listener = (event) => setMatches(event.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [query]);

  return matches;
}

/**
 * useDebounce – debounce a value
 */
export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

/**
 * useTimer – countdown / stopwatch timer
 */
export function useTimer(initialSeconds = 0, countDown = false) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      setSeconds((s) => {
        if (countDown && s <= 0) {
          setIsRunning(false);
          return 0;
        }
        return countDown ? s - 1 : s + 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning, countDown]);

  const start  = () => setIsRunning(true);
  const pause  = () => setIsRunning(false);
  const reset  = () => { setIsRunning(false); setSeconds(initialSeconds); };

  const format = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  return { seconds, formatted: format(seconds), isRunning, start, pause, reset };
}
