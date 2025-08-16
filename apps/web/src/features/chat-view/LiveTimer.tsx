// apps/web/src/features/chat-view/LiveTimer.tsx
import { useState, useEffect } from 'react';

interface LiveTimerProps {
  startTime: number;
}

export default function LiveTimer({ startTime }: LiveTimerProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      const seconds = (Date.now() - startTime) / 1000;
      setElapsed(seconds);
    }, 50);

    return () => clearInterval(interval);
  }, [startTime]);

  return (
    <span>[Generating... {elapsed.toFixed(2)}s]</span>
  );
}