'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { AuctionCard } from '@/components/AuctionCard';
import { Search, SlidersHorizontal, Zap, CheckCircle2, LayoutGrid, Clock, X } from 'lucide-react';
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
  { value: 'ENDED', label: 'Sold / Ended', icon: CheckCircle2 },
];

function BrowseAuctionsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQ = searchParams.get('q') || '';
  const initialCategory = searchParams.get('category') || '';
  const isClosingSoon = searchParams.get('closing_soon') === 'true';

  const [auctions, setAuctions] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [q, setQ] = useState(initialQ);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [condition, setCondition] = useState('');
  const [statusTab, setStatusTab] = useState<'ALL' | 'ACTIVE' | 'ENDED'>(
    isClosingSoon ? 'ACTIVE' : 'ALL'
  );
  const [sort, setSort] = useState(isClosingSoon ? 'closing_soon' : 'newest');
  const [loading, setLoading] = useState(true);

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

    if (isClosingSoon) {
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
  }, [q, selectedCategory, condition, sort, statusTab, isClosingSoon, categories]);

  // Client-side strict filter if in closing soon mode
  const displayAuctions = isClosingSoon
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
          {isClosingSoon ? (
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

      {/* Active Filter Banner when in Closing Soon URL */}
      {isClosingSoon && (
        <div className="mb-6 flex items-center justify-between p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 shadow-sm">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Currently filtering by <strong>Closing Soon (under 3 hours remaining)</strong>.
            </span>
          </div>
          <button
            onClick={() => router.push('/auctions')}
            className="flex items-center gap-1 font-bold text-amber-800 hover:text-amber-950 px-2.5 py-1 rounded-lg hover:bg-amber-100 transition"
          >
            <X className="w-3.5 h-3.5" />
            Show All Products
          </button>
        </div>
      )}

      {/* Status Tabs (All Products / Live Now / Sold & Ended) */}
      {!isClosingSoon && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none w-full sm:w-auto">
            {STATUS_TABS.map(({ value, label, icon: Icon }) => {
              const isActive = statusTab === value;
              return (
                <button
                  key={value}
                  onClick={() => {
                    setStatusTab(value as any);
                    if (value === 'ACTIVE') setSort('closing_soon');
                    else setSort('newest');
                  }}
                  className={`shrink-0 flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold border transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-200'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              );
            })}
          </div>

          {/* Summary counts */}
          {statusTab === 'ALL' && !loading && (
            <span className="text-xs text-slate-400 font-medium shrink-0">
              {auctions.length} total · <span className="text-emerald-600 font-semibold">{liveCount} live</span> · {endedCount} ended
            </span>
          )}
        </div>
      )}

      {/* Filters Toolbar */}
      <div className="p-3.5 sm:p-4 bg-white rounded-2xl border border-slate-200 shadow-sm mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          {/* Filters Title Header */}
          <div className="flex items-center justify-between sm:justify-start gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider pb-2 sm:pb-0 border-b sm:border-b-0 sm:border-r border-slate-200 sm:pr-3 shrink-0">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
              <span>Filters</span>
            </div>
            {(selectedCategory || condition) && (
              <button
                onClick={() => {
                  setSelectedCategory('');
                  setCondition('');
                }}
                className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 sm:hidden"
              >
                Reset
              </button>
            )}
          </div>

          {/* Filter Dropdowns Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:items-center gap-2.5 sm:gap-3 flex-1 min-w-0">
            {/* Category */}
            <div className="w-full sm:w-auto">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full sm:w-auto text-xs font-semibold bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 transition cursor-pointer"
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.slug}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Condition */}
            <div className="w-full sm:w-auto">
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className="w-full sm:w-auto text-xs font-semibold bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 transition cursor-pointer"
              >
                <option value="">Any Condition</option>
                <option value="NEW">New</option>
                <option value="LIKE_NEW">Like New</option>
                <option value="GOOD">Good</option>
                <option value="FAIR">Fair</option>
              </select>
            </div>

            {/* Sort */}
            {!isClosingSoon && (
              <div className="w-full sm:w-auto sm:ml-auto flex items-center justify-between sm:justify-end gap-2 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                <span className="text-xs text-slate-500 font-medium shrink-0">Sort by:</span>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="w-full sm:w-auto text-xs font-semibold bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 transition cursor-pointer"
                >
                  <option value="newest">Recently Listed</option>
                  <option value="closing_soon">Closing Soonest</option>
                  <option value="price_low">Lowest Price</option>
                  <option value="price_high">Highest Price</option>
                </select>
              </div>
            )}
          </div>
        </div>
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
          <div className="text-4xl">🔍</div>
          <p className="text-slate-700 font-bold text-base">
            {isClosingSoon
              ? 'No active auctions are currently closing within 3 hours.'
              : 'No auctions matched your filter criteria.'}
          </p>
          <p className="text-slate-400 text-xs">
            {isClosingSoon
              ? 'Check back soon for last-minute anti-sniping bids, or browse all live items.'
              : 'Try clearing your filters or changing search keywords.'}
          </p>
          <button
            onClick={() => {
              setQ('');
              setSelectedCategory('');
              setCondition('');
              if (isClosingSoon) {
                router.push('/auctions');
              } else {
                setStatusTab('ALL');
              }
            }}
            className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-bold text-xs hover:bg-indigo-100 transition"
          >
            View All Products
          </button>
        </div>
      ) : (
        <>
          {/* When showing ALL: render Live section first, then Ended */}
          {statusTab === 'ALL' && !isClosingSoon ? (
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
