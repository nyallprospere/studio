'use client';

import { useState, useEffect } from 'react';

type CountdownProps = {
  date: Date;
};

export default function Countdown({ date }: CountdownProps) {
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
    // Set initial time left on mount to avoid hydration mismatch
    setTimeLeft(calculateTimeLeft());
    
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const timeParts = [
    { label: 'Days', value: timeLeft.days },
    { label: 'Hours', value: timeLeft.hours },
    { label: 'Minutes', value: timeLeft.minutes },
    { label: 'Seconds', value: timeLeft.seconds },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
      {timeParts.map(({ label, value }) => (
        <div key={label} className="bg-primary/10 p-4 rounded-lg">
          <div className="text-4xl md:text-6xl font-bold text-primary font-headline">
            {value !== undefined ? String(value).padStart(2, '0') : '00'}
          </div>
          <div className="text-sm md:text-base text-muted-foreground uppercase tracking-wider">{label}</div>
        </div>
      ))}
    </div>
  );
}
