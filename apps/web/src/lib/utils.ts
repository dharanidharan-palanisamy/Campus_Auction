import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatINR(cents: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function getTimeRemaining(closingTime: string | Date): {
  totalMs: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isUrgent: boolean;
  isExpired: boolean;
} {
  const totalMs = new Date(closingTime).getTime() - Date.now();
  if (totalMs <= 0) {
    return { totalMs: 0, days: 0, hours: 0, minutes: 0, seconds: 0, isUrgent: false, isExpired: true };
  }

  const seconds = Math.floor((totalMs / 1000) % 60);
  const minutes = Math.floor((totalMs / 1000 / 60) % 60);
  const hours = Math.floor((totalMs / (1000 * 60 * 60)) % 24);
  const days = Math.floor(totalMs / (1000 * 60 * 60 * 24));

  return {
    totalMs,
    days,
    hours,
    minutes,
    seconds,
    isUrgent: totalMs <= 15 * 60 * 1000, // < 15 mins
    isExpired: false,
  };
}
