'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { API_BASE } from '@/lib/api';
import {
  Gavel,
  Search,
  RefreshCw,
  ExternalLink,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  User,
  Package,
  Clock
} from 'lucide-react';

export default function AdminBidsPage() {
  const [bids, setBids] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');


  const fetchBids = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('campus_admin_token') || localStorage.getItem('campus_token');
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        search
      });

      const res = await fetch(`${API_BASE}/admin/bids?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setBids(data.data || []);
        if (data.pagination) {
          setTotal(data.pagination.total);
          setTotalPages(data.pagination.totalPages);
        }
      }
    } catch (err) {
      console.error('Failed to load bids', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBids();
  }, [page]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchBids();
  };

  const formatINR = (cents: number) => {
    return `₹${(cents / 100).toLocaleString('en-IN')}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Bid Monitoring</h1>
          <p className="text-sm text-slate-500">
            Immutable public bid trail. Bids are permanently recorded for auditability and campus trust.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchBids()}
            className="flex items-center gap-1.5 px-3 py-2 bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold shadow-sm transition"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" /> Refresh Feed
          </button>
          <div className="text-sm font-semibold text-slate-600 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
            Total Accepted Bids: <span className="font-bold text-indigo-600">{total}</span>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by student alias, ID, or auction title..."
            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-sm transition"
        >
          Search
        </button>
      </form>

      {/* Bids View */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-2" />
            <p className="text-sm font-medium">Loading immutable bid records...</p>
          </div>
        ) : bids.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Gavel className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="font-semibold text-slate-600">No bids match the search query.</p>
          </div>
        ) : (
          <>
            {/* 1. Mobile Cards (< 768px) */}
            <div className="md:hidden divide-y divide-slate-100">
              {bids.map((b) => (
                <div key={b.id} className="p-4 space-y-2.5 hover:bg-slate-50/60 transition">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono font-black text-indigo-600 text-lg block">
                        {formatINR(b.amountInCents)}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Bid ID: {b.id.slice(0, 8)}...
                      </span>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        b.listing?.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        {b.listing?.status || 'ACTIVE'}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" /> Validated
                      </span>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-1.5 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Auction Listing</span>
                      <Link
                        href={`/auctions/${b.listing?.id}`}
                        target="_blank"
                        className="font-bold text-slate-900 hover:text-indigo-600 transition truncate block"
                      >
                        {b.listing?.title}
                      </Link>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Bidder</span>
                        <Link
                          href={`/admin/students/${b.bidder?.id}`}
                          className="font-bold text-indigo-600 hover:underline block truncate"
                        >
                          @{b.bidder?.campusAlias}
                        </Link>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Time</span>
                        <span className="text-slate-500 font-mono text-[11px] block truncate">
                          {new Date(b.acceptedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 2. Tablet, Laptop & Desktop Table (>= 768px) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[850px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/75 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Bid ID</th>
                    <th className="py-3 px-4">Accepted Amount</th>
                    <th className="py-3 px-4">Auction Item</th>
                    <th className="py-3 px-4">Bidder Student</th>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Listing Status</th>
                    <th className="py-3 px-4 text-right">Integrity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {bids.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-400">
                        {b.id.slice(0, 8)}...
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 text-base">
                        {formatINR(b.amountInCents)}
                      </td>

                      <td className="py-3.5 px-4">
                        <Link
                          href={`/auctions/${b.listing?.id}`}
                          target="_blank"
                          className="font-bold text-slate-900 hover:text-indigo-600 transition truncate max-w-xs block text-xs"
                        >
                          {b.listing?.title}
                        </Link>
                        <span className="font-mono text-[11px] text-slate-400">ID: {b.listingId.slice(0, 8)}</span>
                      </td>

                      <td className="py-3.5 px-4">
                        <Link
                          href={`/admin/students/${b.bidder?.id}`}
                          className="font-semibold text-indigo-600 hover:text-indigo-800 text-xs block"
                        >
                          @{b.bidder?.campusAlias}
                        </Link>
                        <span className="font-mono text-[11px] text-slate-400">ID: {b.bidder?.studentId}</span>
                      </td>

                      <td className="py-3.5 px-4 text-xs text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{new Date(b.acceptedAt).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', day: 'numeric', month: 'short' })}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${
                          b.listing?.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          {b.listing?.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Validated
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Pagination Bar */}
        <div className="p-3 sm:p-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <span className="text-center sm:text-left">
            Page <span className="font-bold text-slate-800">{page}</span> of <span className="font-bold text-slate-800">{totalPages || 1}</span> ({total} bids total)
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition flex items-center gap-1 font-semibold"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Prev
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition flex items-center gap-1 font-semibold"
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

