import { useEffect, useState } from 'react';

interface ReservationCountdownProps {
  reservationExpiresAt: string | Date;
  onExpired?: () => void;
}

export function ReservationCountdown({ reservationExpiresAt, onExpired }: ReservationCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    const target = new Date(reservationExpiresAt).getTime();

    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const difference = target - now;
      return Math.max(0, Math.floor(difference / 1000));
    };

    const initialTimeLeft = calculateTimeLeft();
    setTimeLeft(initialTimeLeft);

    if (initialTimeLeft === 0) {
      onExpired?.();
      return;
    }

    const timer = setInterval(() => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);
      
      if (remaining === 0) {
        clearInterval(timer);
        onExpired?.();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [reservationExpiresAt, onExpired]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  if (timeLeft === 0) {
    return <span className="text-muted-foreground">00:00</span>;
  }

  return (
    <span className="font-mono tabular-nums text-yellow-500">
      {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
    </span>
  );
}
