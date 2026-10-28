'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatINR, getTimeRemaining } from '@/lib/utils';
import { Clock, MapPin, CheckCircle2, XCircle, TrendingUp } from 'lucide-react';

interface AuctionCardProps {
  auction: {
    id: string;
    title: string;
    status: string;
    condition: string;
    startingPriceInCents: number;
    currentLeadingBidInCents: number;
    closingTime: string;
    pickupLocation: string;
    images: { url: string }[];
    category?: { name: string };
    seller?: { campusAlias: string };
    _count?: { bids: number };
  };
}

function getStatusMeta(status: string, closingTime: string) {
  const now = new Date();
  const closing = new Date(closingTime);

  if (status === 'ACTIVE' && closing > now) {
    return { label: 'Live', color: 'bg-emerald-500', textColor: 'text-emerald-700', badgeBg: 'bg-emerald-50 border-emerald-200', isLive: true };
  }
  if (status === 'COMPLETED') {
    return { label: 'Sold', color: 'bg-rose-500', textColor: 'text-rose-700', badgeBg: 'bg-rose-50 border-rose-200', isLive: false };
  }
  if (status === 'UNSOLD') {
    return { label: 'Unsold', color: 'bg-slate-500', textColor: 'text-slate-600', badgeBg: 'bg-slate-100 border-slate-200', isLive: false };
  }
  if (status === 'CANCELLED' || status === 'REJECTED') {
    return { label: 'Cancelled', color: 'bg-slate-400', textColor: 'text-slate-500', badgeBg: 'bg-slate-100 border-slate-200', isLive: false };
  }
  // Expired active auction
  if (status === 'ACTIVE' && closing <= now) {
    return { label: 'Ended', color: 'bg-slate-500', textColor: 'text-slate-600', badgeBg: 'bg-slate-100 border-slate-200', isLive: false };
  }
  return { label: status, color: 'bg-slate-400', textColor: 'text-slate-500', badgeBg: 'bg-slate-100 border-slate-200', isLive: false };
}

export function AuctionCard({ auction }: AuctionCardProps) {
  const [timeLeft, setTimeLeft] = useState(getTimeRemaining(auction.closingTime));
  const statusMeta = getStatusMeta(auction.status, auction.closingTime);

  useEffect(() => {
    if (!statusMeta.isLive) return;
    const timer = setInterval(() => {
      setTimeLeft(getTimeRemaining(auction.closingTime));
    }, 1000);
    return () => clearInterval(timer);
  }, [auction.closingTime, statusMeta.isLive]);

  const currentPrice = auction.currentLeadingBidInCents > 0
    ? auction.currentLeadingBidInCents
    : auction.startingPriceInCents;

  const imageUrl = auction.images && auction.images.length > 0
    ? auction.images[0].url
    : 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80';

  const isEnded = !statusMeta.isLive;
  const isSold = auction.status === 'COMPLETED';

  return (
    <Link
      href={`/auctions/${auction.id}`}
      className={`group flex flex-col bg-white rounded-2xl border overflow-hidden shadow-sm transition-all duration-300 ${
        isEnded
          ? 'border-slate-200 opacity-80 hover:opacity-100 hover:shadow-md'
          : 'border-slate-200 hover:shadow-xl hover:border-indigo-300'
      }`}
    >
      {/* Image Container */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
        <img
          src={imageUrl}
          alt={auction.title}
          className={`w-full h-full object-cover transition-transform duration-500 ${
            isEnded ? 'grayscale-[40%]' : 'group-hover:scale-105'
          }`}
        />

        {/* Sold / Ended overlay */}
        {isEnded && (
          <div className="absolute inset-0 bg-slate-900/30 flex items-center justify-center">
            <div className={`px-4 py-2 rounded-full font-black text-sm tracking-wide ${
              isSold ? 'bg-rose-600 text-white' : 'bg-slate-700 text-white'
            }`}>
              {isSold ? '🏷️ SOLD OUT' : '🔒 AUCTION ENDED'}
            </div>
          </div>
        )}

        {/* Top bar: Category on left, Status on right (isolated, never overlaps) */}
        <div className="absolute top-3 inset-x-3 flex items-center justify-between gap-2 z-10 pointer-events-none">
          {auction.category ? (
            <span className="bg-white/95 backdrop-blur-sm text-slate-800 text-xs font-semibold px-2.5 py-1 rounded-full shadow-sm truncate max-w-[150px]">
              {auction.category.name}
            </span>
          ) : <div />}

          <div className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border backdrop-blur-md shadow-sm ${statusMeta.badgeBg} ${statusMeta.textColor}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.color} ${statusMeta.isLive ? 'animate-pulse' : ''}`} />
            {statusMeta.label}
          </div>
        </div>

        {/* Bottom bar: Condition on left, Countdown on right */}
        <div className="absolute bottom-3 inset-x-3 flex items-center justify-between gap-2 z-10 pointer-events-none">
          <span className="bg-slate-900/80 backdrop-blur-md text-white text-[11px] font-semibold px-2.5 py-1 rounded-full shadow-sm">
            {auction.condition?.replace('_', ' ')}
          </span>

          {/* Countdown / Closed Badge */}
          {statusMeta.isLive ? (
            <div className={`shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-md shadow-md ${
              timeLeft.isExpired
                ? 'bg-slate-900/90 text-slate-300'
                : timeLeft.isUrgent
                ? 'bg-rose-600 text-white animate-pulse'
                : 'bg-white/90 text-slate-900'
            }`}>
              <Clock className="w-3.5 h-3.5" />
              {timeLeft.isExpired ? (
                'Ended'
              ) : (
                <span>
                  {timeLeft.days > 0 && `${timeLeft.days}d `}
                  {String(timeLeft.hours).padStart(2, '0')}:
                  {String(timeLeft.minutes).padStart(2, '0')}:
                  {String(timeLeft.seconds).padStart(2, '0')}
                </span>
              )}
            </div>
          ) : (
            <div className="shrink-0 bg-slate-900/80 backdrop-blur-md text-white text-xs font-medium px-2.5 py-1 rounded-full">
              Closed {new Date(auction.closingTime).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            </div>
          )}
        </div>
      </div>

      {/* Card Body */}
      <div className="flex flex-col flex-1 p-5">
        <h3 className={`font-bold text-base line-clamp-2 transition ${
          isEnded ? 'text-slate-600 group-hover:text-slate-800' : 'text-slate-900 group-hover:text-indigo-600'
        }`}>
          {auction.title}
        </h3>

        <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
          <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
          <span className="truncate">{auction.pickupLocation}</span>
        </div>

        <div className="mt-auto pt-4 flex items-end justify-between border-t border-slate-100">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              {isSold ? 'Final Sold Price' : auction.currentLeadingBidInCents > 0 ? 'Leading Bid' : 'Starting Price'}
            </span>
            <div className={`text-xl font-black ${isSold ? 'text-rose-600' : 'text-slate-900'}`}>
              {formatINR(currentPrice)}
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-semibold text-slate-500">
              {auction._count?.bids || 0} bids
            </span>
            <div className="mt-0.5 text-xs font-bold">
              {statusMeta.isLive ? (
                <span className="text-indigo-600 group-hover:underline">Bid Now →</span>
              ) : isSold ? (
                <span className="text-rose-500 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Sold</span>
              ) : (
                <span className="text-slate-400 flex items-center gap-1"><XCircle className="w-3 h-3" /> Ended</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
