import { useState, useEffect } from 'react';

interface CountdownResult {
  minutes: number;
  seconds: number;
  isExpired: boolean;
  formatted: string;
}

export function useCountdown(targetDate: Date | string | null): CountdownResult {
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    if (!targetDate) {
      setTimeLeft(0);
      return;
    }

    const target = typeof targetDate === 'string' ? new Date(targetDate).getTime() : targetDate.getTime();

    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const difference = target - now;
      return Math.max(0, Math.floor(difference / 1000));
    };

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const isExpired = timeLeft <= 0 && targetDate !== null;
  const formatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  return { minutes, seconds, isExpired, formatted };
}
