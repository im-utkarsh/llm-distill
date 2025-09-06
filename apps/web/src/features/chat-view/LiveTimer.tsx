// apps/web/src/features/chat-view/LiveTimer.tsx
import { useState, useEffect } from 'react';

/**
 * Props for the LiveTimer component.
 * @typedef {object} LiveTimerProps
 * @property {number} startTime - The `Date.now()` timestamp when the timer should start.
 */
interface LiveTimerProps {
  startTime: number;
}

/**
 * Displays a continuously updating timer showing the elapsed time in seconds
 * since a given start time. Used to show "Time to First Token".
 * @param {LiveTimerProps} props - The component props.
 * @returns {React.ReactElement} A span element with the formatted elapsed time.
 */
export default function LiveTimer({ startTime }: LiveTimerProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    // Set up an interval to update the elapsed time every 50ms.
    const interval = setInterval(() => {
      const seconds = (Date.now() - startTime) / 1000;
      setElapsed(seconds);
    }, 50);

    // Clean up the interval when the component unmounts.
    return () => clearInterval(interval);
  }, [startTime]);

  return (
    <span>[Generating... {elapsed.toFixed(2)}s]</span>
  );
}