'use client';

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAdminSocket } from '@/hooks/useAdminSocket';
import {
  Gavel,
  Search,
  Clock,
  ExternalLink,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  User,
  Activity
} from 'lucide-react';

export default function AdminAuctionsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading auction monitor...</div>}>
      <AdminAuctionsContent />
    </Suspense>
  );
}

function AdminAuctionsContent() {
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get('status') || 'ALL';

  const [auctions, setAuctions] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const s = searchParams.get('status');
    if (s) {
      setStatusFilter(s);
      setPage(1);
    }
  }, [searchParams]);

  // Timeline / Events Modal
  const [selectedAuctionId, setSelectedAuctionId] = useState<string | null>(null);
  const [timelineData, setTimelineData] = useState<{ events: any[]; bids: any[] } | null>(null);
  const [timelineLoading, setTimelineLoading] = useState(false);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

  const fetchAuctions = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('campus_admin_token') || localStorage.getItem('campus_token');
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        status: statusFilter,
        search
      });

      const res = await fetch(`${API_BASE}/admin/auctions?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAuctions(data.data || []);
        if (data.pagination) {
          setTotal(data.pagination.total);
          setTotalPages(data.pagination.totalPages);
        }
      }
    } catch (err) {
      console.error('Failed to load auctions', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuctions();
  }, [page, statusFilter]);

  // Real-time dynamic updates when client places bids or creates listings
  const handleLiveEvent = useCallback((event: any) => {
    if (
      event.type === 'BID_PLACED' ||
      event.type === 'LISTING_CREATED' ||
      event.type === 'LISTING_MODERATED'
    ) {
      fetchAuctions();
    }
  }, [page, statusFilter]);

  useAdminSocket(handleLiveEvent);

  // Close timeline modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedAuctionId) {
          setSelectedAuctionId(null);
          setTimelineData(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedAuctionId]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchAuctions();
  };

  const handleOpenTimeline = async (id: string) => {
    try {
      setSelectedAuctionId(id);
      setTimelineLoading(true);
      const token = localStorage.getItem('campus_admin_token') || localStorage.getItem('campus_token');
      const res = await fetch(`${API_BASE}/admin/auctions/${id}/events`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTimelineData(data.data);
      }
    } catch (err) {
      console.error('Failed to load auction events', err);
    } finally {
      setTimelineLoading(false);
    }
  };

  const formatINR = (cents: number) => {
    return `₹${(cents / 100).toLocaleString('en-IN')}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Auction Monitoring</h1>
          <p className="text-sm text-slate-500">
            Real-time auction lifecycle tracking, anti-sniping extension inspections, and public bid integrity.
          </p>
        </div>
        <div className="text-sm font-semibold text-slate-600 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
          Monitored Auctions: <span className="font-bold text-indigo-600">{total}</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200">
        {[
          { key: 'ALL', label: 'All Auctions' },
          { key: 'LIVE', label: 'Live Now' },
          { key: 'CLOSING_SOON', label: 'Closing Soon (< 3h)' },
          { key: 'COMPLETED', label: 'Completed' },
          { key: 'UNSOLD', label: 'Unsold' },
          { key: 'CANCELLED', label: 'Cancelled' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setStatusFilter(tab.key);
              setPage(1);
            }}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition whitespace-nowrap ${
              statusFilter === tab.key
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search auctions by product title or seller alias..."
            className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-sm transition"
        >
          Search
        </button>
      </form>

      {/* Auctions Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-2" />
            <p className="text-sm font-medium">Tracking live auctions...</p>
          </div>
        ) : auctions.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Gavel className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="font-semibold text-slate-600">No auctions match the selected filter.</p>
          </div>
        ) : (
          <>
            {/* 1. Mobile Responsive Cards (< 768px) */}
            <div className="md:hidden divide-y divide-slate-100">
              {auctions.map((auc) => {
                const leadingBid = auc.bids?.[0];
                const isLive = auc.status === 'ACTIVE' && new Date(auc.closingTime) > new Date();

                return (
                  <div key={auc.id} className="p-4 space-y-3 hover:bg-slate-50/60 transition">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="font-bold text-sm text-slate-900 truncate">{auc.title}</h4>
                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                          <span>@{auc.seller?.campusAlias}</span>
                          <span>•</span>
                          <span>{auc.category?.name || 'Item'}</span>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${
                        isLive
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : auc.status === 'COMPLETED'
                          ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                        {isLive ? 'LIVE' : auc.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Leading Bid</span>
                        <span className="font-mono font-bold text-indigo-600 text-sm">
                          {formatINR(auc.currentLeadingBidInCents || auc.startingPriceInCents)}
                        </span>
                        {leadingBid && (
                          <span className="text-[10px] text-slate-500 block truncate">
                            by @{leadingBid.bidder?.campusAlias}
                          </span>
                        )}
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Bids Placed</span>
                        <span className="font-mono text-slate-700 font-semibold">
                          {auc._count?.bids || 0} bids
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          Closes: {new Date(auc.closingTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-slate-400 font-mono">
                        ID: {auc.id.slice(0, 8)}...
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenTimeline(auc.id)}
                          className="px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 border border-indigo-100 rounded-lg transition inline-flex items-center gap-1"
                        >
                          <Activity className="w-3.5 h-3.5" /> Events
                        </button>
                        <Link
                          href={`/auctions/${auc.id}`}
                          target="_blank"
                          className="p-1.5 text-slate-400 hover:text-slate-700 border border-slate-200 rounded-lg transition"
                          title="Open live listing"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 2. Tablet, Laptop & Desktop Table (>= 768px) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[950px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Auction Item</th>
                  <th className="py-3 px-4">Seller</th>
                  <th className="py-3 px-4">Leading Bidder</th>
                  <th className="py-3 px-4">Starting</th>
                  <th className="py-3 px-4">Current Amount</th>
                  <th className="py-3 px-4">Bids</th>
                  <th className="py-3 px-4">Closing Time</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {auctions.map((auc) => {
                  const leadingBid = auc.bids?.[0];
                  const isLive = auc.status === 'ACTIVE' && new Date(auc.closingTime) > new Date();

                  return (
                    <tr key={auc.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-900 truncate max-w-xs">{auc.title}</p>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                          <span className="font-mono">{auc.id.slice(0, 8)}...</span>
                          <span>•</span>
                          <span>{auc.category?.name || 'Item'}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-xs">
                        <span className="font-semibold text-slate-700">@{auc.seller?.campusAlias}</span>
                      </td>

                      <td className="py-3.5 px-4 text-xs">
                        {leadingBid ? (
                          <span className="font-semibold text-emerald-600">
                            @{leadingBid.bidder?.campusAlias}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">No bids yet</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-xs text-slate-600">
                        {formatINR(auc.startingPriceInCents)}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-xs font-bold text-indigo-600">
                        {formatINR(auc.currentLeadingBidInCents || auc.startingPriceInCents)}
                      </td>

                      <td className="py-3.5 px-4 text-xs font-semibold text-slate-700">
                        {auc._count?.bids || 0}
                      </td>

                      <td className="py-3.5 px-4 text-xs">
                        <div className="flex items-center gap-1.5 font-medium text-slate-700">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{new Date(auc.closingTime).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                          isLive
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : auc.status === 'COMPLETED'
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}>
                          {isLive ? 'LIVE' : auc.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenTimeline(auc.id)}
                            className="px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 rounded-lg transition inline-flex items-center gap-1"
                          >
                            <Activity className="w-3.5 h-3.5" /> Events
                          </button>
                          <Link
                            href={`/auctions/${auc.id}`}
                            target="_blank"
                            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition"
                            title="Open live listing"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

        {/* Pagination Bar */}
        <div className="p-4 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Page {page} of {totalPages} ({total} auctions)
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Events / Timeline Modal */}
      {selectedAuctionId && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-xl w-full max-h-[85vh] overflow-y-auto shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Auction Activity Timeline</h3>
                  <p className="text-xs font-mono text-slate-400">ID: {selectedAuctionId}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedAuctionId(null);
                  setTimelineData(null);
                }}
                className="text-slate-400 hover:text-slate-700 font-bold p-1"
              >
                ✕
              </button>
            </div>

            {timelineLoading ? (
              <div className="py-12 text-center text-slate-400 flex flex-col items-center">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mb-2" />
                <p className="text-xs">Loading event audit log...</p>
              </div>
            ) : timelineData ? (
              <div className="space-y-6 text-sm">
                {/* Anti-Sniping & Lifecycle Events */}
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Lifecycle Events ({timelineData.events?.length || 0})
                  </h4>
                  {timelineData.events && timelineData.events.length > 0 ? (
                    <div className="space-y-2">
                      {timelineData.events.map((ev: any) => (
                        <div key={ev.id} className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs flex items-center justify-between">
                          <div>
                            <span className="font-semibold text-slate-800">{ev.eventType}</span>
                            {ev.payload && (
                              <span className="text-slate-500 ml-2">
                                {typeof ev.payload === 'string' ? ev.payload : JSON.stringify(ev.payload)}
                              </span>
                            )}
                          </div>
                          <span className="text-slate-400">{new Date(ev.createdAt).toLocaleTimeString('en-IN')}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No lifecycle events recorded.</p>
                  )}
                </div>

                {/* Bids Log */}
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Accepted Bids ({timelineData.bids?.length || 0})
                  </h4>
                  {timelineData.bids && timelineData.bids.length > 0 ? (
                    <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                      {timelineData.bids.map((b: any, idx: number) => (
                        <div key={b.id} className={`p-2.5 flex items-center justify-between text-xs ${idx === 0 ? 'bg-emerald-50/50' : ''}`}>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-900">{formatINR(b.amountInCents)}</span>
                            <span className="text-slate-600">by @{b.bidder?.campusAlias} ({b.bidder?.studentId})</span>
                          </div>
                          <span className="text-slate-400">{new Date(b.acceptedAt).toLocaleTimeString('en-IN')}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No bids submitted yet.</p>
                  )}
                </div>
              </div>
            ) : null}

            <div className="mt-6 pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => {
                  setSelectedAuctionId(null);
                  setTimelineData(null);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

