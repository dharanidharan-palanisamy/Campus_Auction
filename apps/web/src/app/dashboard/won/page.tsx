'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { formatINR } from '@/lib/utils';
import {
  ShoppingBag,
  QrCode,
  ShieldCheck,
  MapPin,
  Clock,
  CheckCircle2,
  ExternalLink,
  TrendingUp,
  Search,
  ImageIcon
} from 'lucide-react';
import { HandoverPassModal } from '@/components/HandoverPassModal';

interface WonAuctionItem {
  id: string;
  listingId: string;
  winnerId: string;
  sellerId: string;
  finalAmountInCents: number;
  sellerDecision: string;
  status?: string;
  qrHandoverCode?: string;
  handoverCompletedAt?: string;
  createdAt: string;
  listing?: {
    id?: string;
    _id?: string;
    title: string;
    description?: string;
    handoverLocation?: string;
    condition?: string;
    category?: { name?: string } | string;
    images?: Array<{ url: string }> | string[];
    seller?: {
      campusAlias?: string;
      fullName?: string;
    };
  };
}

export default function ItemsWonPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [wonAuctions, setWonAuctions] = useState<WonAuctionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'COMPLETED'>('ALL');

  // Handover QR Modal State
  const [selectedListingIdForPass, setSelectedListingIdForPass] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    const token = localStorage.getItem('campus_token');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('http://localhost:4000/api/v1/student/dashboard', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const resData = await res.json();
      if (res.ok && resData.success && resData.data?.wonAuctions) {
        setWonAuctions(resData.data.wonAuctions);
      }
    } catch (err) {
      console.error('Failed to load won auctions', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  // Metrics
  const totalWonCount = wonAuctions.length;
  const totalSpent = wonAuctions.reduce((acc, curr) => acc + (curr.finalAmountInCents || 0), 0);
  const completedCount = wonAuctions.filter(
    w => w.sellerDecision === 'COMPLETED' || w.status === 'COMPLETED' || w.handoverCompletedAt
  ).length;
  const pendingCount = Math.max(0, totalWonCount - completedCount);

  // Filter won items
  const filteredItems = wonAuctions.filter(item => {
    const titleMatch = item.listing?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.listing?.seller?.campusAlias?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.listing?.handoverLocation?.toLowerCase().includes(searchQuery.toLowerCase());

    if (!titleMatch) return false;

    const isCompleted = item.sellerDecision === 'COMPLETED' || item.status === 'COMPLETED' || Boolean(item.handoverCompletedAt);
    if (statusFilter === 'COMPLETED') return isCompleted;
    if (statusFilter === 'PENDING') return !isCompleted;
    return true;
  });

  if (authLoading || (loading && !user)) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <div className="w-12 h-12 border-4 border-[#633BFF] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm font-semibold text-slate-500">Loading won items...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 bg-[#F1EEFF] text-[#633BFF] rounded-3xl flex items-center justify-center mx-auto mb-4">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-[#15152D]">Items Won</h2>
        <p className="text-sm text-slate-500 mt-2 mb-6">
          Please log in with your verified campus student account to view items you have won.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#633BFF] hover:bg-[#5145FF] text-white font-bold rounded-2xl shadow-md transition"
        >
          Sign In to View Won Items
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F8FF] py-8 sm:py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Page Header */}
        <div className="bg-white rounded-3xl border border-[#E5EAF2] p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-xs">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-[#15152D] tracking-tight">
                Items Won & Handover Status
              </h1>
              <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                {totalWonCount} Won
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500">
              Auctions won through fair bidding. Use your secure one-time QR Handover Pass for verified campus inspection and exchange.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/auctions"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
            >
              Browse Live Auctions
            </Link>
          </div>
        </div>

        {/* Key Metrics Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-[#E5EAF2] shadow-xs">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Total Items Won</span>
              <ShoppingBag className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-black text-[#15152D]">{totalWonCount}</div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">Auctions won</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#E5EAF2] shadow-xs">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Total Investment</span>
              <TrendingUp className="w-4 h-4 text-[#633BFF]" />
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-black text-[#633BFF]">
              {formatINR(totalSpent)}
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">Final winning bids</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#E5EAF2] shadow-xs">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Pending Handover</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-black text-amber-600">{pendingCount}</div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">Awaiting exchange</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#E5EAF2] shadow-xs">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Completed Handovers</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-black text-emerald-600">{completedCount}</div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">Verified exchanges</span>
          </div>
        </div>

        {/* Campus Handover Guide Notice */}
        <div className="bg-gradient-to-r from-[#F1EEFF] to-[#E5EAF2]/40 rounded-2xl border border-[#633BFF]/20 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#633BFF] text-white flex items-center justify-center shrink-0">
              <QrCode className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <h3 className="text-xs sm:text-sm font-black text-[#15152D]">
                Campus Safety Protocol: How QR Handover Works
              </h3>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Meet your fellow student seller at the agreed campus location. Inspect the item in daylight. Once satisfied, click <strong>Open Handover Pass</strong> and show the secure QR / PIN code to finalize the transfer.
              </p>
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white p-4 rounded-2xl border border-[#E5EAF2] shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search won items by title, seller, or handover location..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs font-medium text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#633BFF]/20 focus:border-[#633BFF]"
            />
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {[
              { id: 'ALL', label: 'All Won Items' },
              { id: 'PENDING', label: 'Pending Handover' },
              { id: 'COMPLETED', label: 'Completed' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                  statusFilter === tab.id
                    ? 'bg-[#633BFF] text-white shadow-xs'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Won Items List */}
        {filteredItems.length === 0 ? (
          <div className="bg-white rounded-3xl border border-[#E5EAF2] p-12 text-center space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <ShoppingBag className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-black text-[#15152D]">No Won Items Found</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {searchQuery || statusFilter !== 'ALL'
                ? 'No won auctions matched your search or status filter. Try clearing filters.'
                : "You haven't won any auctions yet. Check out live listings closing soon and place fair bids to win gear from verified fellow students!"}
            </p>
            <Link
              href="/auctions"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#633BFF] hover:bg-[#5145FF] text-white text-xs font-bold rounded-xl shadow-md transition"
            >
              Browse Active Auctions
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredItems.map(item => {
              const targetListingId = item.listingId || item.listing?.id || (item.listing as any)?._id;
              
              // Extract image
              let imgUrl = '';
              if (Array.isArray(item.listing?.images) && item.listing.images.length > 0) {
                const img0 = item.listing.images[0];
                imgUrl = typeof img0 === 'string' ? img0 : (img0 as any)?.url || '';
              }

              const isCompleted =
                item.sellerDecision === 'COMPLETED' ||
                item.status === 'COMPLETED' ||
                Boolean(item.handoverCompletedAt);

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-3xl border border-[#E5EAF2] p-5 sm:p-6 shadow-xs hover:border-[#633BFF]/30 transition flex flex-col md:flex-row md:items-center justify-between gap-5"
                >
                  {/* Left: Thumbnail & Essential Fields */}
                  <div className="flex items-start gap-4">
                    <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                      {imgUrl ? (
                        <img
                          src={imgUrl}
                          alt={item.listing?.title || 'Won Item'}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="w-8 h-8 text-slate-300" />
                      )}
                      <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-black/70 text-white backdrop-blur-xs">
                        {item.listing?.condition?.replace('_', ' ') || 'LIKE NEW'}
                      </span>
                    </div>

                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#F1EEFF] text-[#633BFF] border border-[#633BFF]/20">
                          {typeof item.listing?.category === 'object'
                            ? (item.listing.category as any)?.name
                            : item.listing?.category || 'Campus Item'}
                        </span>

                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${
                            isCompleted
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {isCompleted ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Handover Completed
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3 text-amber-600" />
                              {item.sellerDecision || 'Pending Handover'}
                            </>
                          )}
                        </span>
                      </div>

                      <Link
                        href={`/auctions/${targetListingId}`}
                        className="font-black text-base sm:text-lg text-[#15152D] hover:text-[#633BFF] transition line-clamp-1 block"
                      >
                        {item.listing?.title || 'Campus Auction Item'}
                      </Link>

                      {/* Seller Alias & Verification */}
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <span className="font-semibold text-slate-700">
                          Seller: @{item.listing?.seller?.campusAlias || 'CampusSeller'}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="text-emerald-600 font-semibold flex items-center gap-0.5 text-[11px]">
                          <ShieldCheck className="w-3.5 h-3.5" /> Verified Student
                        </span>
                      </div>

                      {/* Handover Location */}
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 pt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">
                          {item.listing?.handoverLocation || 'Campus Meeting Point'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Winning Price & Handover Pass Action */}
                  <div className="flex flex-row md:flex-col items-center md:items-end justify-between border-t md:border-t-0 pt-4 md:pt-0 border-slate-100 gap-4 shrink-0">
                    <div className="text-left md:text-right">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                        Winning Bid Amount
                      </span>
                      <span className="text-xl sm:text-2xl font-black text-emerald-700 block">
                        {formatINR(item.finalAmountInCents)}
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        Won on {new Date(item.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Interactive Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedListingIdForPass(targetListingId)}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#633BFF] to-[#536BFF] hover:brightness-110 shadow-md shadow-[#633BFF]/25 transition active:scale-[0.98]"
                      >
                        <QrCode className="w-4 h-4" />
                        <span>Open Handover Pass</span>
                      </button>

                      <Link
                        href={`/auctions/${targetListingId}`}
                        className="p-2 sm:px-3 sm:py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1"
                        title="View Auction Details"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Details</span>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* QR Handover Pass Modal (Closes on ESC or clicking outside) */}
      {selectedListingIdForPass && (
        <HandoverPassModal
          listingId={selectedListingIdForPass}
          isOpen={Boolean(selectedListingIdForPass)}
          onClose={() => setSelectedListingIdForPass(null)}
          onHandoverComplete={() => {
            fetchDashboardData();
          }}
        />
      )}
    </div>
  );
}

