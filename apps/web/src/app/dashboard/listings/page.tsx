'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { formatINR, getTimeRemaining } from '@/lib/utils';
import {
  Package,
  PlusCircle,
  TrendingUp,
  Gavel,
  Clock,
  MapPin,
  Pencil,
  Trash2,
  ExternalLink,
  Search,
  CheckCircle2,
  AlertCircle,
  X,
  ImageIcon,
  ArrowUpDown
} from 'lucide-react';

interface ListingItem {
  id: string;
  _id?: string;
  title: string;
  description?: string;
  startingPriceInCents: number;
  currentLeadingBidInCents?: number;
  minIncrementInCents: number;
  status: string;
  condition: string;
  handoverLocation: string;
  closingTime: string;
  createdAt: string;
  images?: Array<{ url: string; displayOrder?: number }> | string[];
  category?: { id?: string; name?: string; slug?: string } | string;
  categoryId?: string;
  _count?: { bids: number };
}

export default function MyListingsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [listings, setListings] = useState<ListingItem[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<string>('NEWEST');

  // Edit Listing Modal State
  const [editingListing, setEditingListing] = useState<ListingItem | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    categoryId: '',
    condition: 'GOOD',
    description: '',
    handoverLocation: '',
    imageUrl: '',
    startingPrice: '',
    minIncrement: '',
  });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');

  // Delete Action State
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    const token = localStorage.getItem('campus_token');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [dashRes, catRes] = await Promise.all([
        fetch('http://localhost:4000/api/v1/student/dashboard', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('http://localhost:4000/api/v1/auctions/categories'),
      ]);

      const dashData = await dashRes.json();
      const catData = await catRes.json();

      if (catData.success) {
        setCategories(catData.data || []);
      }

      if (dashData.success && dashData.data?.activeListings) {
        setListings(dashData.data.activeListings);
      }
    } catch (err) {
      console.error('Failed to load listings', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  // Handle ESC key for modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && editingListing) {
        setEditingListing(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editingListing]);

  // Open Edit Modal
  const openEditModal = (item: ListingItem) => {
    setEditingListing(item);
    setEditError('');
    setEditSuccess('');

    // Extract image url
    let firstImg = '';
    if (Array.isArray(item.images) && item.images.length > 0) {
      const img0 = item.images[0];
      firstImg = typeof img0 === 'string' ? img0 : (img0 as any)?.url || '';
    }

    // Extract category id
    const catId = typeof item.category === 'object' && item.category !== null 
      ? (item.category as any).id || (item.category as any)._id || '' 
      : (item.categoryId || '');

    setEditForm({
      title: item.title || '',
      categoryId: catId,
      condition: item.condition || 'GOOD',
      description: item.description || '',
      handoverLocation: item.handoverLocation || '',
      imageUrl: firstImg,
      startingPrice: Math.round(item.startingPriceInCents / 100).toString(),
      minIncrement: Math.round(item.minIncrementInCents / 100).toString(),
    });
  };

  // Submit Edit Modal
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingListing) return;

    setEditSaving(true);
    setEditError('');
    setEditSuccess('');

    const token = localStorage.getItem('campus_token');
    const hasBids = (editingListing._count?.bids || 0) > 0;

    const payload: any = {
      title: editForm.title.trim(),
      condition: editForm.condition,
      description: editForm.description.trim(),
      pickupLocation: editForm.handoverLocation.trim(),
    };

    if (editForm.categoryId) {
      payload.categoryId = editForm.categoryId;
    }

    if (editForm.imageUrl.trim()) {
      payload.imageUrls = [editForm.imageUrl.trim()];
    }

    if (!hasBids) {
      const startingCents = Math.round(parseFloat(editForm.startingPrice) * 100);
      const incCents = Math.round(parseFloat(editForm.minIncrement) * 100);
      if (!isNaN(startingCents) && startingCents > 0) payload.startingPriceInCents = startingCents;
      if (!isNaN(incCents) && incCents > 0) payload.minIncrementInCents = incCents;
    }

    try {
      const res = await fetch(`http://localhost:4000/api/v1/auctions/${editingListing.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token || ''}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setEditSuccess('Listing updated successfully!');
        setTimeout(() => {
          setEditingListing(null);
          fetchDashboardData();
        }, 800);
      } else {
        setEditError(data.message || 'Failed to update listing');
      }
    } catch (err: any) {
      setEditError(err.message || 'Error updating listing');
    } finally {
      setEditSaving(false);
    }
  };

  // Handle Delete
  const handleDeleteListing = async (listingId: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"? This cannot be undone.`)) {
      return;
    }

    setDeletingId(listingId);
    const token = localStorage.getItem('campus_token');
    try {
      const res = await fetch(`http://localhost:4000/api/v1/auctions/${listingId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token || ''}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setListings(prev => prev.filter(item => item.id !== listingId));
      } else {
        alert(data.message || 'Failed to delete listing');
      }
    } catch (err: any) {
      alert(err.message || 'Error deleting listing');
    } finally {
      setDeletingId(null);
    }
  };

  // Calculate Metrics
  const totalListings = listings.length;
  const totalBidsReceived = listings.reduce((acc, curr) => acc + (curr._count?.bids || 0), 0);
  const totalLeadingValue = listings.reduce((acc, curr) => {
    return acc + (curr.currentLeadingBidInCents || curr.startingPriceInCents || 0);
  }, 0);
  const activeAuctionsCount = listings.filter(l => l.status === 'ACTIVE').length;

  // Filter and Sort
  const filteredListings = listings
    .filter(item => {
      // Search
      const matchSearch =
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.handoverLocation?.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchSearch) return false;

      // Status Filter
      if (selectedStatus === 'HAS_BIDS') {
        return (item._count?.bids || 0) > 0;
      }
      if (selectedStatus === 'CLOSING_SOON') {
        const { totalMs } = getTimeRemaining(item.closingTime);
        return totalMs > 0 && totalMs <= 3 * 3600 * 1000;
      }
      if (selectedStatus === 'ACTIVE') {
        return item.status === 'ACTIVE';
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'NEWEST') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === 'HIGHEST_BID') {
        const bidA = a.currentLeadingBidInCents || a.startingPriceInCents;
        const bidB = b.currentLeadingBidInCents || b.startingPriceInCents;
        return bidB - bidA;
      }
      if (sortBy === 'MOST_BIDS') {
        return (b._count?.bids || 0) - (a._count?.bids || 0);
      }
      if (sortBy === 'CLOSING_SOON') {
        return new Date(a.closingTime).getTime() - new Date(b.closingTime).getTime();
      }
      return 0;
    });

  if (authLoading || (loading && !user)) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <div className="w-12 h-12 border-4 border-[#633BFF] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm font-semibold text-slate-500">Loading your listings...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 bg-[#F1EEFF] text-[#633BFF] rounded-3xl flex items-center justify-center mx-auto mb-4">
          <Package className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-[#15152D]">My Listings</h2>
        <p className="text-sm text-slate-500 mt-2 mb-6">
          Please log in with your verified campus student account to manage your listings.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#633BFF] hover:bg-[#5145FF] text-white font-bold rounded-2xl shadow-md transition"
        >
          Sign In to Access Listings
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
              <div className="w-10 h-10 rounded-2xl bg-[#F1EEFF] text-[#633BFF] flex items-center justify-center shadow-xs">
                <Package className="w-5 h-5" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-[#15152D] tracking-tight">
                My Listings
              </h1>
              <span className="px-3 py-1 rounded-full text-xs font-black bg-[#F1EEFF] text-[#633BFF] border border-[#633BFF]/20">
                {totalListings} {totalListings === 1 ? 'Item' : 'Items'}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500">
              Manage your live campus auctions, monitor real-time student bids, and coordinate safe handovers.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/listings/new"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold text-white bg-gradient-to-r from-[#633BFF] to-[#536BFF] hover:brightness-110 shadow-md shadow-[#633BFF]/25 transition active:scale-[0.98]"
            >
              <PlusCircle className="w-4 h-4" />
              Create New Listing
            </Link>
          </div>
        </div>

        {/* Key Selling Metrics Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-[#E5EAF2] shadow-xs">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Total Listings</span>
              <Package className="w-4 h-4 text-[#633BFF]" />
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-black text-[#15152D]">{totalListings}</div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">Campus items posted</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#E5EAF2] shadow-xs">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Active Auctions</span>
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-black text-[#15152D]">{activeAuctionsCount}</div>
            <span className="text-[11px] text-emerald-600 font-semibold mt-0.5 block">Accepting student bids</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#E5EAF2] shadow-xs">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Total Bids Placed</span>
              <Gavel className="w-4 h-4 text-[#3563FF]" />
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-black text-[#15152D]">{totalBidsReceived}</div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">Across all your listings</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#E5EAF2] shadow-xs">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Leading Bids Value</span>
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-black text-emerald-600">
              {formatINR(totalLeadingValue)}
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">Potential earnings</span>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white p-4 rounded-2xl border border-[#E5EAF2] shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search your listings by title or handover location..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs font-medium text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#633BFF]/20 focus:border-[#633BFF]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {[
              { id: 'ALL', label: 'All Items' },
              { id: 'ACTIVE', label: 'Active Live' },
              { id: 'HAS_BIDS', label: 'Has Bids' },
              { id: 'CLOSING_SOON', label: 'Closing Soon' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedStatus(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                  selectedStatus === tab.id
                    ? 'bg-[#633BFF] text-white shadow-xs'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-[#633BFF]"
            >
              <option value="NEWEST">Newest Listed</option>
              <option value="HIGHEST_BID">Highest Leading Bid</option>
              <option value="MOST_BIDS">Most Bids</option>
              <option value="CLOSING_SOON">Closing Soonest</option>
            </select>
          </div>
        </div>

        {/* Listings Display Grid / Cards */}
        {filteredListings.length === 0 ? (
          <div className="bg-white rounded-3xl border border-[#E5EAF2] p-12 text-center space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-[#F1EEFF] text-[#633BFF] flex items-center justify-center mx-auto">
              <Package className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-black text-[#15152D]">No Listings Found</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {searchQuery || selectedStatus !== 'ALL'
                ? 'No items matched your current search or filter criteria. Try clearing filters.'
                : "You haven't listed any items for auction yet. Start selling your bicycle, calculator, textbooks, or hostel gear!"}
            </p>
            {searchQuery || selectedStatus !== 'ALL' ? (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedStatus('ALL');
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
              >
                Clear Filters
              </button>
            ) : (
              <Link
                href="/dashboard/listings/new"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#633BFF] hover:bg-[#5145FF] text-white text-xs font-bold rounded-xl shadow-md transition"
              >
                <PlusCircle className="w-4 h-4" />
                Create Your First Listing
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredListings.map(item => {
              // Extract preview image
              let imgUrl = '';
              if (Array.isArray(item.images) && item.images.length > 0) {
                const img0 = item.images[0];
                imgUrl = typeof img0 === 'string' ? img0 : (img0 as any)?.url || '';
              }

              // Category title
              const catName = typeof item.category === 'object' && item.category !== null
                ? (item.category as any).name
                : 'Campus Gear';

              // Remaining time
              const { hours, minutes, days, isUrgent, isExpired } = getTimeRemaining(item.closingTime);
              const bidCount = item._count?.bids || 0;
              const currentBid = item.currentLeadingBidInCents || item.startingPriceInCents;

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-3xl border border-[#E5EAF2] p-5 sm:p-6 shadow-xs hover:border-[#633BFF]/30 transition flex flex-col md:flex-row md:items-center justify-between gap-5"
                >
                  {/* Left: Thumbnail & Essential Fields */}
                  <div className="flex items-start gap-4">
                    {/* Thumbnail Image */}
                    <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                      {imgUrl ? (
                        <img
                          src={imgUrl}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="w-8 h-8 text-slate-300" />
                      )}
                      <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-black/70 text-white backdrop-blur-xs">
                        {item.condition?.replace('_', ' ') || 'GOOD'}
                      </span>
                    </div>

                    {/* Content Details */}
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#F1EEFF] text-[#633BFF] border border-[#633BFF]/20">
                          {catName}
                        </span>
                        <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          {item.status}
                        </span>
                      </div>

                      <Link
                        href={`/auctions/${item.id}`}
                        className="font-black text-base sm:text-lg text-[#15152D] hover:text-[#633BFF] transition line-clamp-1 block"
                      >
                        {item.title}
                      </Link>

                      {/* Handover Location */}
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{item.handoverLocation || 'Campus Meeting Spot'}</span>
                      </div>

                      {/* Time Remaining / Bids */}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-1">
                        <span className="font-semibold text-slate-700 flex items-center gap-1">
                          <Gavel className="w-3.5 h-3.5 text-[#633BFF]" />
                          {bidCount > 0 ? `${bidCount} bids placed` : 'No bids yet'}
                        </span>
                        <span>•</span>
                        <span className={`font-semibold flex items-center gap-1 ${isUrgent ? 'text-amber-600 font-bold' : ''}`}>
                          <Clock className="w-3.5 h-3.5" />
                          {isExpired
                            ? 'Auction Ended'
                            : days > 0
                            ? `${days}d ${hours}h remaining`
                            : `${hours}h ${minutes}m remaining`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Pricing & Actions */}
                  <div className="flex flex-row md:flex-col items-center md:items-end justify-between border-t md:border-t-0 pt-4 md:pt-0 border-slate-100 gap-4 shrink-0">
                    <div className="text-left md:text-right">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                        {bidCount > 0 ? 'Current Leading Bid' : 'Starting Price'}
                      </span>
                      <span className="text-xl sm:text-2xl font-black text-[#633BFF] block">
                        {formatINR(currentBid)}
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        Min increment: +{formatINR(item.minIncrementInCents)}
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(item)}
                        className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5"
                        title="Edit Listing Details"
                      >
                        <Pencil className="w-3.5 h-3.5 text-[#633BFF]" />
                        <span className="hidden sm:inline">Edit</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteListing(item.id, item.title)}
                        disabled={deletingId === item.id}
                        className="p-2 sm:px-3 sm:py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50"
                        title="Delete Listing"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Delete</span>
                      </button>

                      <Link
                        href={`/auctions/${item.id}`}
                        className="px-3.5 py-2 rounded-xl bg-[#633BFF] hover:bg-[#5145FF] text-white text-xs font-bold shadow-sm transition flex items-center gap-1"
                      >
                        <span>View</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* Edit Listing Modal (Closes on ESC, backdrop click, or close button) */}
      {editingListing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={e => {
            if (e.target === e.currentTarget) setEditingListing(null);
          }}
        >
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 border border-slate-200 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-[#F1EEFF] text-[#633BFF] rounded-xl">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-[#15152D]">Edit Product Details</h3>
                  <p className="text-xs text-slate-400">Update your campus listing information</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingListing(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error & Success Alerts */}
            {editError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{editError}</span>
              </div>
            )}
            {editSuccess && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{editSuccess}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSaveEdit} className="space-y-4">
              {/* Item Title */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Item Title
                </label>
                <input
                  type="text"
                  required
                  value={editForm.title}
                  onChange={e => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#633BFF]/20 focus:border-[#633BFF]"
                />
              </div>

              {/* Category & Condition Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Category
                  </label>
                  <select
                    value={editForm.categoryId}
                    onChange={e => setEditForm(prev => ({ ...prev, categoryId: e.target.value }))}
                    className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-[#633BFF]"
                  >
                    <option value="">Select Category</option>
                    {categories.map(c => (
                      <option key={c.id || c._id} value={c.id || c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Condition
                  </label>
                  <select
                    value={editForm.condition}
                    onChange={e => setEditForm(prev => ({ ...prev, condition: e.target.value }))}
                    className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-[#633BFF]"
                  >
                    <option value="BRAND_NEW">Brand New</option>
                    <option value="LIKE_NEW">Like New</option>
                    <option value="GOOD">Good</option>
                    <option value="FAIR">Fair</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={editForm.description}
                  onChange={e => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#633BFF]/20 focus:border-[#633BFF]"
                  placeholder="Detail condition, included cables, textbooks edition, lock code, etc."
                />
              </div>

              {/* Starting Price & Increment Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Starting Price (₹)
                    </label>
                    {(editingListing._count?.bids || 0) > 0 && (
                      <span className="text-[10px] font-black text-amber-600 uppercase">
                        (Locked - Bids Exist)
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    disabled={(editingListing._count?.bids || 0) > 0}
                    value={editForm.startingPrice}
                    onChange={e => setEditForm(prev => ({ ...prev, startingPrice: e.target.value }))}
                    className={`w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-slate-200 ${
                      (editingListing._count?.bids || 0) > 0
                        ? 'bg-slate-100 text-slate-500 cursor-not-allowed'
                        : 'bg-slate-50 focus:bg-white focus:border-[#633BFF]'
                    }`}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Min Increment (₹)
                    </label>
                    {(editingListing._count?.bids || 0) > 0 && (
                      <span className="text-[10px] font-black text-amber-600 uppercase">
                        (Locked)
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    disabled={(editingListing._count?.bids || 0) > 0}
                    value={editForm.minIncrement}
                    onChange={e => setEditForm(prev => ({ ...prev, minIncrement: e.target.value }))}
                    className={`w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-slate-200 ${
                      (editingListing._count?.bids || 0) > 0
                        ? 'bg-slate-100 text-slate-500 cursor-not-allowed'
                        : 'bg-slate-50 focus:bg-white focus:border-[#633BFF]'
                    }`}
                  />
                </div>
              </div>

              {/* Handover Location */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Campus Handover Location
                </label>
                <input
                  type="text"
                  required
                  value={editForm.handoverLocation}
                  onChange={e => setEditForm(prev => ({ ...prev, handoverLocation: e.target.value }))}
                  placeholder="e.g. Hostel Block 4 Bicycle Stand / Main Campus Gate"
                  className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#633BFF]/20 focus:border-[#633BFF]"
                />
              </div>

              {/* Product Photo URL */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Product Photo URL
                </label>
                <input
                  type="url"
                  value={editForm.imageUrl}
                  onChange={e => setEditForm(prev => ({ ...prev, imageUrl: e.target.value }))}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#633BFF]/20 focus:border-[#633BFF]"
                />
                {editForm.imageUrl && (
                  <div className="mt-2 w-full h-32 rounded-xl overflow-hidden border border-slate-200 bg-slate-900 relative">
                    <img
                      src={editForm.imageUrl}
                      alt="Preview"
                      className="w-full h-full object-contain"
                    />
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-black flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Photo Preview
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingListing(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#633BFF] to-[#536BFF] hover:brightness-110 text-white text-xs font-bold shadow-md shadow-[#633BFF]/25 transition disabled:opacity-50"
                >
                  {editSaving ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

