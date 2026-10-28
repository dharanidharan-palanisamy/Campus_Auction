'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatINR, getTimeRemaining } from '@/lib/utils';
import { Clock, ShieldCheck, MapPin } from 'lucide-react';

interface AuctionCardProps {
  auction: {
    id: string;
    title: string;
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

export function AuctionCard({ auction }: AuctionCardProps) {
  const [timeLeft, setTimeLeft] = useState(getTimeRemaining(auction.closingTime));

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(getTimeRemaining(auction.closingTime));
    }, 1000);
    return () => clearInterval(timer);
  }, [auction.closingTime]);

  const currentPrice = auction.currentLeadingBidInCents > 0
    ? auction.currentLeadingBidInCents
    : auction.startingPriceInCents;

  const imageUrl = auction.images && auction.images.length > 0
    ? auction.images[0].url
    : 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80';

  return (
    <Link
      href={`/auctions/${auction.id}`}
      className="group flex flex-col bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-xl hover:border-indigo-300 transition-all duration-300"
    >
      {/* Image Container with Badges */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
        <img
          src={imageUrl}
          alt={auction.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute top-3 left-3 flex flex-wrap gap-2">
          {auction.category && (
            <span className="bg-white/95 backdrop-blur-sm text-slate-800 text-xs font-semibold px-2.5 py-1 rounded-full shadow-sm">
              {auction.category.name}
            </span>
          )}
          <span className="bg-slate-900/80 backdrop-blur-sm text-white text-xs font-medium px-2 py-1 rounded-full">
            {auction.condition}
          </span>
        </div>

        {/* Live Countdown Tag */}
        <div className={`absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-md shadow-md ${
          timeLeft.isExpired
            ? 'bg-slate-900/90 text-slate-300'
            : timeLeft.isUrgent
            ? 'bg-rose-600 text-white animate-pulse'
            : 'bg-white/90 text-slate-900'
        }`}>
          <Clock className="w-3.5 h-3.5" />
          {timeLeft.isExpired ? (
            'Auction Ended'
          ) : (
            <span>
              {timeLeft.days > 0 && `${timeLeft.days}d `}
              {String(timeLeft.hours).padStart(2, '0')}:
              {String(timeLeft.minutes).padStart(2, '0')}:
              {String(timeLeft.seconds).padStart(2, '0')}
            </span>
          )}
        </div>
      </div>

      {/* Listing Meta & Details */}
      <div className="flex flex-col flex-1 p-5">
        <h3 className="font-bold text-slate-900 text-base line-clamp-2 group-hover:text-indigo-600 transition">
          {auction.title}
        </h3>

        <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
          <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
          <span className="truncate">{auction.pickupLocation}</span>
        </div>

        <div className="mt-auto pt-4 flex items-end justify-between border-t border-slate-100">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              {auction.currentLeadingBidInCents > 0 ? 'Leading Bid' : 'Starting Price'}
            </span>
            <div className="text-xl font-black text-slate-900">
              {formatINR(currentPrice)}
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-semibold text-slate-500">
              {auction._count?.bids || 0} bids
            </span>
            <div className="mt-0.5 text-xs font-bold text-indigo-600 group-hover:underline">
              Bid Now →
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
