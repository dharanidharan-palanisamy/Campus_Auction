'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
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

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

  const fetchBids = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('campus_token');
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
      <form onSubmit={handleSearch} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by student alias, student ID, or auction title..."
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

      {/* Bids Table */}
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
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
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
        )}

        {/* Pagination Bar */}
        <div className="p-4 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Page {page} of {totalPages} ({total} bids total)
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
    </div>
  );
}

