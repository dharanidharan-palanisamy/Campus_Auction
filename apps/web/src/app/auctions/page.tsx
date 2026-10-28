'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AuctionCard } from '@/components/AuctionCard';
import { Search, SlidersHorizontal, Zap, CheckCircle2, LayoutGrid, Clock, Flame, AlertCircle } from 'lucide-react';
import { Suspense } from 'react';

export default function BrowseAuctionsPage() {
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto px-4 py-20 text-center text-slate-400">Loading auctions...</div>}>
      <BrowseAuctionsContent />
    </Suspense>
  );
}

const STATUS_TABS = [
  { value: 'ALL', label: 'All Products', icon: LayoutGrid },
  { value: 'ACTIVE', label: 'Live Now', icon: Zap },
  { value: 'CLOSING_SOON', label: 'Closing Soon (< 3h)', icon: Clock },
  { value: 'ENDED', label: 'Sold / Ended', icon: CheckCircle2 },
];

function BrowseAuctionsContent() {
  const searchParams = useSearchParams();
  const initialQ = searchParams.get('q') || '';
  const initialCategory = searchParams.get('category') || '';
  const initialClosingSoon = searchParams.get('closing_soon') === 'true';

  const [auctions, setAuctions] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [q, setQ] = useState(initialQ);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [condition, setCondition] = useState('');
  const [statusTab, setStatusTab] = useState<'ALL' | 'ACTIVE' | 'CLOSING_SOON' | 'ENDED'>(
    initialClosingSoon ? 'CLOSING_SOON' : 'ALL'
  );
  const [sort, setSort] = useState(initialClosingSoon ? 'closing_soon' : 'newest');
  const [loading, setLoading] = useState(true);

  // Sync state if URL query param changes
  useEffect(() => {
    if (searchParams.get('closing_soon') === 'true') {
      setStatusTab('CLOSING_SOON');
      setSort('closing_soon');
    }
  }, [searchParams]);

  useEffect(() => {
    fetch('http://localhost:4000/api/v1/auctions/categories')
      .then(res => res.json())
      .then(data => { if (data.success) setCategories(data.data); });
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();

    // Smart: if q matches a category name exactly, switch to category filter
    const matchedCategory = categories.find(
      (c) => c.name.toLowerCase() === q.toLowerCase()
    );
    const effectiveQ = matchedCategory ? '' : q;
    const effectiveCategory = matchedCategory ? matchedCategory.slug : selectedCategory;

    if (effectiveQ) params.set('q', effectiveQ);
    if (effectiveCategory) params.set('category', effectiveCategory);
    if (condition) params.set('condition', condition);

    if (statusTab === 'CLOSING_SOON') {
      params.set('closing_soon', 'true');
      params.set('max_hours', '3');
      params.set('sort', 'closing_soon');
    } else {
      params.set('status', statusTab);
      params.set('sort', sort);
    }
    params.set('limit', '30');

    fetch(`http://localhost:4000/api/v1/auctions?${params.toString()}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) setAuctions(data.data);
      })
      .finally(() => setLoading(false));
  }, [q, selectedCategory, condition, sort, statusTab, categories]);

  // Client-side strict filter to guarantee:
  // In 'CLOSING_SOON' tab: ONLY products with <= 3 hours remaining are displayed
  const displayAuctions = statusTab === 'CLOSING_SOON'
    ? auctions.filter((a) => {
        const remainingMs = new Date(a.closingTime).getTime() - Date.now();
        return remainingMs > 0 && remainingMs <= 3 * 3600 * 1000;
      })
    : auctions;

  const liveCount = auctions.filter(a => a.status === 'ACTIVE' && new Date(a.closingTime) > new Date()).length;
  const endedCount = auctions.filter(a => a.status !== 'ACTIVE' || new Date(a.closingTime) <= new Date()).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          {statusTab === 'CLOSING_SOON' ? (
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold mb-2">
                <Clock className="w-3.5 h-3.5" />
                Under 3 Hours Remaining
              </div>
              <h1 className="text-3xl font-black text-slate-900">Closing Soon Auctions</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Displaying products ending within 3 hours. Anti-sniping extensions protect last-minute bids.
              </p>
            </div>
          ) : (
            <div>
              <h1 className="text-3xl font-black text-slate-900">Explore Auctions</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Showing verified student auctions on campus
              </p>
            </div>
          )}
        </div>

        {/* Search */}
        <div className="relative max-w-sm w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search keywords or titles..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-500 bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Status Tabs */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        {STATUS_TABS.map(({ value, label, icon: Icon }) => {
          const isActive = statusTab === value;
          const isUrgentTab = value === 'CLOSING_SOON';
          return (
            <button
              key={value}
              onClick={() => {
                setStatusTab(value as any);
                if (value === 'CLOSING_SOON' || value === 'ACTIVE') setSort('closing_soon');
                else setSort('newest');
              }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                isActive
                  ? isUrgentTab
                    ? 'bg-amber-600 text-white border-amber-600 shadow-sm shadow-amber-200'
                    : 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-200'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          );
        })}

        {/* Summary counts */}
        {statusTab === 'ALL' && !loading && (
          <span className="ml-auto text-xs text-slate-400 font-medium">
            {auctions.length} total · <span className="text-emerald-600 font-semibold">{liveCount} live</span> · {endedCount} ended
          </span>
        )}
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-wrap items-center gap-3 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm mb-8">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider pr-3 border-r border-slate-200">
          <SlidersHorizontal className="w-4 h-4" />
          Filters
        </div>

        {/* Category */}
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.slug}>{c.name}</option>
          ))}
        </select>

        {/* Condition */}
        <select
          value={condition}
          onChange={(e) => setCondition(e.target.value)}
          className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
        >
          <option value="">Any Condition</option>
          <option value="NEW">New</option>
          <option value="LIKE_NEW">Like New</option>
          <option value="GOOD">Good</option>
          <option value="FAIR">Fair</option>
        </select>

        {/* Sort (only show relevant options when not in closing_soon mode) */}
        {statusTab !== 'CLOSING_SOON' && (
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-slate-400">Sort by:</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              <option value="newest">Recently Listed</option>
              <option value="closing_soon">Closing Soonest</option>
              <option value="price_low">Lowest Price</option>
              <option value="price_high">Highest Price</option>
            </select>
          </div>
        )}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
            <div key={n} className="h-80 bg-slate-200 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : displayAuctions.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300 space-y-3">
          <div className="text-4xl">⏱️</div>
          <p className="text-slate-700 font-bold text-base">
            {statusTab === 'CLOSING_SOON'
              ? 'No auctions are currently closing within 3 hours.'
              : 'No auctions matched your filter criteria.'}
          </p>
          <p className="text-slate-400 text-xs">
            {statusTab === 'CLOSING_SOON'
              ? 'Check back soon for urgent last-minute bids, or explore all live products.'
              : 'Try clearing your filters or changing search keywords.'}
          </p>
          <button
            onClick={() => {
              setQ('');
              setSelectedCategory('');
              setCondition('');
              setStatusTab('ALL');
            }}
            className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-bold text-xs hover:bg-indigo-100 transition"
          >
            View All Products
          </button>
        </div>
      ) : (
        <>
          {/* When showing ALL: render Live section first, then Ended */}
          {statusTab === 'ALL' ? (
            <>
              {/* Live Section */}
              {displayAuctions.filter(a => a.status === 'ACTIVE' && new Date(a.closingTime) > new Date()).length > 0 && (
                <div className="mb-10">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <h2 className="text-base font-bold text-slate-800">Live Auctions</h2>
                    <span className="ml-1 text-xs bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full">
                      {displayAuctions.filter(a => a.status === 'ACTIVE' && new Date(a.closingTime) > new Date()).length} active
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {displayAuctions
                      .filter(a => a.status === 'ACTIVE' && new Date(a.closingTime) > new Date())
                      .map((auction) => <AuctionCard key={auction.id} auction={auction} />)}
                  </div>
                </div>
              )}

              {/* Ended / Sold Section */}
              {displayAuctions.filter(a => a.status !== 'ACTIVE' || new Date(a.closingTime) <= new Date()).length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="w-2 h-2 rounded-full bg-slate-400" />
                    <h2 className="text-base font-bold text-slate-800">Sold & Ended</h2>
                    <span className="ml-1 text-xs bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full">
                      {displayAuctions.filter(a => a.status !== 'ACTIVE' || new Date(a.closingTime) <= new Date()).length} items
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {displayAuctions
                      .filter(a => a.status !== 'ACTIVE' || new Date(a.closingTime) <= new Date())
                      .map((auction) => <AuctionCard key={auction.id} auction={auction} />)}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {displayAuctions.map((auction) => <AuctionCard key={auction.id} auction={auction} />)}
            </div>
          )}
        </>
      )}
    </div>
  );
}
