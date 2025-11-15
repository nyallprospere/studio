
'use client';

import { useState, useEffect } from 'react';

type CountdownProps = {
  date: Date;
};

export default function Countdown({ date }: CountdownProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const calculateTimeLeft = () => {
    const difference = +date - +new Date();
    let timeLeft = {};

    if (difference > 0) {
      timeLeft = {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      };
    } else {
        timeLeft = { days: 0, hours: 0, minutes: 0, seconds: 0 };
    }

    return timeLeft;
  };

  const [timeLeft, setTimeLeft] = useState<{
    days?: number;
    hours?: number;
    minutes?: number;
    seconds?: number;
  }>({});

  useEffect(() => {
    if (!isClient) {
        return;
    }
    // Set initial time left on mount to avoid hydration mismatch
    setTimeLeft(calculateTimeLeft());
    
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, isClient]);

  const timeParts = [
    { label: 'Days', value: timeLeft.days },
    { label: 'Hours', value: timeLeft.hours },
    { label: 'Minutes', value: timeLeft.minutes },
    { label: 'Seconds', value: timeLeft.seconds },
  ];

  if (!isClient) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center">
            {timeParts.map(({ label }) => (
                <div key={label} className="bg-primary/10 p-2 rounded-lg">
                <div className="text-3xl md:text-4xl font-bold text-primary font-headline">
                    00
                </div>
                <div className="text-xs md:text-sm text-muted-foreground uppercase tracking-wider">{label}</div>
                </div>
            ))}
        </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center">
      {timeParts.map(({ label, value }) => (
        <div key={label} className="bg-primary/10 p-2 rounded-lg">
          <div className="text-3xl md:text-4xl font-bold text-primary font-headline">
            {value !== undefined ? String(value).padStart(2, '0') : '00'}
          </div>
          <div className="text-xs md:text-sm text-muted-foreground uppercase tracking-wider">{label}</div>
        </div>
      ))}
    </div>
  );
}
