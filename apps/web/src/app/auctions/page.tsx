'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { AuctionCard } from '@/components/AuctionCard';
import { API_BASE } from '@/lib/api';
import { 
  Search, 
  SlidersHorizontal, 
  Zap, 
  CheckCircle2, 
  LayoutGrid, 
  Clock, 
  X, 
  ArrowUpDown,
  RotateCcw,
  Tag
} from 'lucide-react';
import { Suspense } from 'react';

export default function BrowseAuctionsPage() {
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto px-4 py-20 text-center text-slate-400">Loading marketplace auctions...</div>}>
      <BrowseAuctionsContent />
    </Suspense>
  );
}

const STATUS_TABS = [
  { value: 'ALL', label: 'All Products', icon: LayoutGrid },
  { value: 'ACTIVE', label: 'Live Now', icon: Zap },
  { value: 'ENDED', label: 'Sold & Ended', icon: CheckCircle2 },
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
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [statusTab, setStatusTab] = useState<'ALL' | 'ACTIVE' | 'ENDED'>(
    isClosingSoon ? 'ACTIVE' : 'ALL'
  );
  const [sort, setSort] = useState(isClosingSoon ? 'closing_soon' : 'newest');
  const [loading, setLoading] = useState(true);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/auctions/categories`)
      .then(res => res.json())
      .then(data => { if (data.success) setCategories(data.data); })
      .catch(err => console.error('Failed to fetch categories:', err));
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();

    // Check if q matches a category slug or name
    const matchedCategory = categories.find(
      (c) => c.name.toLowerCase() === q.toLowerCase() || c.slug.toLowerCase() === q.toLowerCase()
    );
    const effectiveQ = matchedCategory ? '' : q;
    const effectiveCategory = matchedCategory ? matchedCategory.slug : selectedCategory;

    if (effectiveQ) params.set('q', effectiveQ);
    if (effectiveCategory) params.set('category', effectiveCategory);
    if (condition) params.set('condition', condition);
    if (minPrice) params.set('minPrice', minPrice);
    if (maxPrice) params.set('maxPrice', maxPrice);

    if (isClosingSoon) {
      params.set('closing_soon', 'true');
      params.set('max_hours', '3');
      params.set('sort', 'closing_soon');
    } else {
      params.set('status', statusTab);
      params.set('sort', sort);
    }
    params.set('limit', '40');

    fetch(`${API_BASE}/auctions?${params.toString()}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) setAuctions(data.data);
      })
      .catch(err => console.error('Failed to fetch auctions:', err))
      .finally(() => setLoading(false));
  }, [q, selectedCategory, condition, minPrice, maxPrice, sort, statusTab, isClosingSoon, categories]);

  // Client-side strict filter if in closing soon mode
  const displayAuctions = isClosingSoon
    ? auctions.filter((a) => {
        const remainingMs = new Date(a.closingTime).getTime() - Date.now();
        return remainingMs > 0 && remainingMs <= 3 * 3600 * 1000;
      })
    : auctions;

  const hasActiveFilters = Boolean(q || selectedCategory || condition || minPrice || maxPrice);

  const clearAllFilters = () => {
    setQ('');
    setSelectedCategory('');
    setCondition('');
    setMinPrice('');
    setMaxPrice('');
    if (isClosingSoon) {
      router.push('/auctions');
    }
  };

  const getCategoryName = (slug: string) => {
    const c = categories.find(item => item.slug === slug);
    return c ? c.name : slug;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          {isClosingSoon ? (
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-black uppercase tracking-wider mb-2">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                Under 3 Hours Remaining
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-[#11182D]">Closing Soon Auctions</h1>
              <p className="text-xs sm:text-sm text-[#718096] mt-0.5">
                Last chance to bid before timers expire. Anti-sniping extensions protect last-minute fair bids.
              </p>
            </div>
          ) : (
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-[#11182D]">Browse Auctions</h1>
              <p className="text-xs sm:text-sm text-[#718096] mt-0.5">
                Verified student listings available for campus inspection and transparent bidding.
              </p>
            </div>
          )}
        </div>

        {/* Search Input Bar */}
        <div className="relative max-w-sm w-full">
          <Search className="w-4 h-4 text-[#718096] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search keywords, titles, models..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full pl-10 pr-9 py-2.5 text-xs sm:text-sm text-[#151B2C] placeholder:text-[#718096] bg-white rounded-xl border border-[#E5EAF2] focus:outline-none focus:border-[#5145FF] focus:ring-2 focus:ring-indigo-100 transition shadow-xs"
          />
          {q && (
            <button
              onClick={() => setQ('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#718096] hover:text-[#151B2C]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Closing Soon Filter Notice */}
      {isClosingSoon && (
        <div className="mb-6 flex items-center justify-between p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 shadow-xs">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Currently filtering by <strong>Closing Soon (&lt; 3 hours remaining)</strong>.</span>
          </div>
          <button
            onClick={() => router.push('/auctions')}
            className="flex items-center gap-1 font-bold text-amber-800 hover:text-amber-950 px-2.5 py-1 rounded-lg hover:bg-amber-100 transition"
          >
            <X className="w-3.5 h-3.5" />
            Show All Auctions
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
                  className={`shrink-0 flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold border transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-[#5145FF] text-white border-[#5145FF] shadow-xs shadow-indigo-200'
                      : 'bg-white text-[#718096] border-[#E5EAF2] hover:border-indigo-300 hover:text-[#5145FF]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3 text-xs text-[#718096]">
            <span>
              <strong>{displayAuctions.length}</strong> items found
            </span>
            <button
              onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
              className="sm:hidden flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#E5EAF2] bg-white font-bold text-[#151B2C]"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#5145FF]" />
              Filters
            </button>
          </div>
        </div>
      )}

      {/* Filter Toolbar (Desktop & Mobile Drawer) */}
      <div className={`p-4 bg-white rounded-2xl border border-[#E5EAF2] shadow-xs mb-6 ${mobileFiltersOpen ? 'block' : 'hidden sm:block'}`}>
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          {/* Label */}
          <div className="flex items-center gap-2 text-xs font-black text-[#151B2C] uppercase tracking-wider lg:pr-3 lg:border-r border-[#E5EAF2] shrink-0">
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#5145FF]" />
            <span>Filters</span>
          </div>

          {/* Filters Form Elements */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:items-center gap-2.5 sm:gap-3 flex-1 min-w-0">
            {/* Category Select */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-xs font-bold bg-[#F7F9FC] border border-[#E5EAF2] rounded-xl px-3 py-2 text-[#151B2C] focus:outline-none focus:border-[#5145FF] transition cursor-pointer"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id || c.slug} value={c.slug}>{c.name}</option>
              ))}
            </select>

            {/* Condition Select */}
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              className="text-xs font-bold bg-[#F7F9FC] border border-[#E5EAF2] rounded-xl px-3 py-2 text-[#151B2C] focus:outline-none focus:border-[#5145FF] transition cursor-pointer"
            >
              <option value="">Any Condition</option>
              <option value="NEW">New</option>
              <option value="LIKE_NEW">Like New</option>
              <option value="GOOD">Good</option>
              <option value="FAIR">Fair</option>
            </select>

            {/* Price Range inputs */}
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                placeholder="Min ₹"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className="w-20 text-xs font-bold bg-[#F7F9FC] border border-[#E5EAF2] rounded-xl px-2.5 py-2 text-[#151B2C] focus:outline-none focus:border-[#5145FF]"
              />
              <span className="text-[#718096] text-xs">-</span>
              <input
                type="number"
                placeholder="Max ₹"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="w-20 text-xs font-bold bg-[#F7F9FC] border border-[#E5EAF2] rounded-xl px-2.5 py-2 text-[#151B2C] focus:outline-none focus:border-[#5145FF]"
              />
            </div>

            {/* Sort Options */}
            {!isClosingSoon && (
              <div className="lg:ml-auto flex items-center gap-2">
                <span className="text-xs font-semibold text-[#718096] shrink-0">Sort by:</span>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="text-xs font-bold bg-[#F7F9FC] border border-[#E5EAF2] rounded-xl px-3 py-2 text-[#151B2C] focus:outline-none focus:border-[#5145FF] transition cursor-pointer"
                >
                  <option value="newest">Newest First</option>
                  <option value="closing_soon">Closing Soon</option>
                  <option value="price_low">Lowest Leading Bid</option>
                  <option value="price_high">Highest Leading Bid</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Active Filter Chips */}
        {hasActiveFilters && (
          <div className="mt-3 pt-3 border-t border-[#E5EAF2] flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold text-[#718096]">Active Filters:</span>
            {q && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 text-[#5145FF] text-xs font-bold">
                "{q}"
                <button onClick={() => setQ('')} className="hover:text-indigo-800"><X className="w-3 h-3" /></button>
              </span>
            )}
            {selectedCategory && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 text-[#5145FF] text-xs font-bold">
                Category: {getCategoryName(selectedCategory)}
                <button onClick={() => setSelectedCategory('')} className="hover:text-indigo-800"><X className="w-3 h-3" /></button>
              </span>
            )}
            {condition && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 text-[#5145FF] text-xs font-bold">
                Condition: {condition}
                <button onClick={() => setCondition('')} className="hover:text-indigo-800"><X className="w-3 h-3" /></button>
              </span>
            )}
            {(minPrice || maxPrice) && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 text-[#5145FF] text-xs font-bold">
                Price: ₹{minPrice || 0} - ₹{maxPrice || '∞'}
                <button onClick={() => { setMinPrice(''); setMaxPrice(''); }} className="hover:text-indigo-800"><X className="w-3 h-3" /></button>
              </span>
            )}
            <button
              onClick={clearAllFilters}
              className="text-xs font-bold text-rose-600 hover:text-rose-700 ml-auto flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              Clear All Filters
            </button>
          </div>
        )}
      </div>

      {/* Auction Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
            <div key={n} className="h-80 rounded-2xl bg-slate-200 animate-pulse" />
          ))}
        </div>
      ) : displayAuctions.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {displayAuctions.map((auction) => (
            <AuctionCard key={auction.id} auction={auction} />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-[#E5EAF2] p-12 text-center max-w-md mx-auto my-12 shadow-xs">
          <Tag className="w-12 h-12 text-[#718096] mx-auto mb-3" />
          <h3 className="text-base font-black text-[#151B2C]">No Auctions Found</h3>
          <p className="text-xs text-[#718096] mt-1 leading-relaxed">
            We couldn't find any listings matching your search or active filters. Try adjusting your search query or reset the filters.
          </p>
          <button
            onClick={clearAllFilters}
            className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#5145FF] hover:bg-[#4338CA] text-white text-xs font-bold transition shadow-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset All Filters
          </button>
        </div>
      )}
    </div>
  );
}
