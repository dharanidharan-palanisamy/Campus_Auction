'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Package,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Eye,
  Trash2,
  ExternalLink,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Tag,
  DollarSign,
  Gavel
} from 'lucide-react';

export default function AdminListingsPage() {
  const [listings, setListings] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(12);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusTab, setStatusTab] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('');

  // Modals state
  const [inspectListing, setInspectListing] = useState<any | null>(null);
  const [inspectLoading, setInspectLoading] = useState(false);

  const [moderateModal, setModerateModal] = useState<{ id: string; targetStatus: string; title: string } | null>(null);
  const [moderateReason, setModerateReason] = useState('');

  const [deleteModal, setDeleteModal] = useState<{ id: string; title: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

  // Fetch categories
  useEffect(() => {
    const fetchCats = async () => {
      try {
        const token = localStorage.getItem('campus_token');
        const res = await fetch(`${API_BASE}/admin/categories`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
          setCategories(data.data || []);
        }
      } catch (err) {
        console.error('Failed to load categories', err);
      }
    };
    fetchCats();
  }, []);

  const fetchListings = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('campus_token');
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        status: statusTab,
        category: selectedCategory,
        search
      });

      const res = await fetch(`${API_BASE}/admin/listings?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setListings(data.data || []);
        if (data.pagination) {
          setTotal(data.pagination.total);
          setTotalPages(data.pagination.totalPages);
        }
      }
    } catch (err) {
      console.error('Failed to load listings', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListings();
  }, [page, statusTab, selectedCategory]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchListings();
  };

  const handleOpenInspect = async (id: string) => {
    try {
      setInspectLoading(true);
      const token = localStorage.getItem('campus_token');
      const res = await fetch(`${API_BASE}/admin/listings/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setInspectListing(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setInspectLoading(false);
    }
  };

  const handleModerateSubmit = async () => {
    if (!moderateModal) return;
    if (['REJECTED', 'CANCELLED'].includes(moderateModal.targetStatus) && !moderateReason.trim()) {
      alert('Please provide a mandatory reason for rejecting or cancelling the listing.');
      return;
    }

    try {
      setActionLoading(true);
      const token = localStorage.getItem('campus_token');
      const res = await fetch(`${API_BASE}/admin/listings/${moderateModal.id}/moderate`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          status: moderateModal.targetStatus,
          reason: moderateReason
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setModerateModal(null);
        setModerateReason('');
        await fetchListings();
        if (inspectListing && inspectListing.id === moderateModal.id) {
          handleOpenInspect(moderateModal.id);
        }
      } else {
        alert(data.message || 'Moderation failed');
      }
    } catch (err: any) {
      alert(err.message || 'Network error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteListing = async () => {
    if (!deleteModal) return;
    try {
      setActionLoading(true);
      const token = localStorage.getItem('campus_token');
      const res = await fetch(`${API_BASE}/admin/listings/${deleteModal.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDeleteModal(null);
        if (inspectListing?.id === deleteModal.id) setInspectListing(null);
        await fetchListings();
      } else {
        alert(data.message || 'Deletion failed');
      }
    } catch (err: any) {
      alert(err.message || 'Network error');
    } finally {
      setActionLoading(false);
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
          <h1 className="text-2xl font-black text-slate-900">Listing Moderation</h1>
          <p className="text-sm text-slate-500">
            Audit, approve, reject, and monitor all student marketplace auction listings.
          </p>
        </div>
        <div className="text-sm font-semibold text-slate-600 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
          Total Listings: <span className="font-bold text-indigo-600">{total}</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200">
        {[
          { key: 'ALL', label: 'All Listings' },
          { key: 'ACTIVE', label: 'Active / Live' },
          { key: 'SCHEDULED', label: 'Scheduled' },
          { key: 'COMPLETED', label: 'Completed' },
          { key: 'UNSOLD', label: 'Unsold' },
          { key: 'CANCELLED', label: 'Cancelled' },
          { key: 'REJECTED', label: 'Rejected' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setStatusTab(tab.key);
              setPage(1);
            }}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition whitespace-nowrap ${
              statusTab === tab.key
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search & Category Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-4">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, description, campus pickup spot, or seller alias..."
            className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </form>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setPage(1);
            }}
            className="text-sm py-2 px-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>

          <button
            onClick={() => {
              setSearch('');
              setSelectedCategory('');
              setStatusTab('ALL');
              setPage(1);
            }}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 px-3 py-2 rounded-xl hover:bg-slate-100 transition whitespace-nowrap"
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* Listings Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-2" />
            <p className="text-sm font-medium">Loading listings...</p>
          </div>
        ) : listings.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Package className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="font-semibold text-slate-600">No listings match the current filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Item Details</th>
                  <th className="py-3 px-4">Seller</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Price / Bids</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Closing / Created</th>
                  <th className="py-3 px-4 text-right">Moderation Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {listings.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        {item.images?.[0]?.storagePath ? (
                          <img
                            src={item.images[0].storagePath}
                            alt=""
                            className="w-12 h-12 rounded-xl object-cover bg-slate-100 border border-slate-200 shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                            <Package className="w-6 h-6" />
                          </div>
                        )}
                        <div className="min-w-0 max-w-xs">
                          <p className="font-bold text-slate-900 truncate">{item.title}</p>
                          <p className="text-xs text-slate-500 truncate">
                            Pickup: {item.pickupLocation || 'Main Campus'}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <Link
                        href={`/admin/students/${item.seller?.id}`}
                        className="font-semibold text-indigo-600 hover:text-indigo-800 text-xs block"
                      >
                        @{item.seller?.campusAlias}
                      </Link>
                      <span className="font-mono text-[11px] text-slate-400">ID: {item.seller?.studentId}</span>
                    </td>

                    <td className="py-3.5 px-4 text-xs font-medium text-slate-600">
                      {item.category?.name || 'General'}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-mono text-xs font-bold text-slate-900">
                        {formatINR(item.currentLeadingBidInCents || item.startingPriceInCents)}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Gavel className="w-3 h-3 text-slate-400" />
                        <span>{item._count?.bids || 0} bids placed</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                        item.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : item.status === 'COMPLETED'
                          ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                          : item.status === 'CANCELLED' || item.status === 'REJECTED'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                        {item.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-xs text-slate-500">
                      <div>Close: {new Date(item.closingTime).toLocaleDateString('en-IN')}</div>
                      <div className="text-[11px] text-slate-400">
                        Created: {new Date(item.createdAt).toLocaleDateString('en-IN')}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenInspect(item.id)}
                          className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                          title="Inspect Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {item.status !== 'ACTIVE' && (
                          <button
                            onClick={() =>
                              setModerateModal({
                                id: item.id,
                                targetStatus: 'ACTIVE',
                                title: item.title,
                              })
                            }
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                            title="Approve / Activate"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}

                        {item.status === 'ACTIVE' && (
                          <button
                            onClick={() =>
                              setModerateModal({
                                id: item.id,
                                targetStatus: 'CANCELLED',
                                title: item.title,
                              })
                            }
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Cancel / Reject Listing"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          onClick={() => setDeleteModal({ id: item.id, title: item.title })}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Delete Listing"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
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
            Page {page} of {totalPages} ({total} listings total)
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

      {/* Inspect Modal */}
      {inspectListing && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
            <div className="flex items-start justify-between mb-4">
              <div>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                  inspectListing.status === 'ACTIVE'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-slate-100 text-slate-700 border-slate-200'
                }`}>
                  {inspectListing.status}
                </span>
                <h3 className="text-xl font-bold text-slate-900 mt-1">{inspectListing.title}</h3>
              </div>
              <button
                onClick={() => setInspectListing(null)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* Images */}
            {inspectListing.images && inspectListing.images.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-4">
                {inspectListing.images.map((img: any) => (
                  <img
                    key={img.id}
                    src={img.storagePath}
                    alt=""
                    className="w-24 h-24 object-cover rounded-xl border border-slate-200"
                  />
                ))}
              </div>
            )}

            <div className="space-y-4 text-sm">
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase">Description</h4>
                <p className="text-slate-700 mt-1 whitespace-pre-wrap bg-slate-50 p-3 rounded-xl border border-slate-100">
                  {inspectListing.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase">Starting Price</h4>
                  <p className="font-mono font-bold text-slate-900">{formatINR(inspectListing.startingPriceInCents)}</p>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase">Current Leading Bid</h4>
                  <p className="font-mono font-bold text-indigo-600">
                    {formatINR(inspectListing.currentLeadingBidInCents || inspectListing.startingPriceInCents)}
                  </p>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase">Seller</h4>
                  <p className="text-slate-800 font-medium">
                    @{inspectListing.seller?.campusAlias} ({inspectListing.seller?.studentId})
                  </p>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase">Campus Pickup</h4>
                  <p className="text-slate-800 font-medium">{inspectListing.pickupLocation || 'Main Campus'}</p>
                </div>
              </div>

              {/* Bids Log */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">
                  Bid History ({inspectListing.bids?.length || 0})
                </h4>
                {inspectListing.bids && inspectListing.bids.length > 0 ? (
                  <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl">
                    {inspectListing.bids.map((b: any) => (
                      <div key={b.id} className="p-2.5 flex items-center justify-between text-xs">
                        <span className="font-mono font-bold text-slate-900">{formatINR(b.amountInCents)}</span>
                        <span className="text-slate-600">@{b.bidder?.campusAlias}</span>
                        <span className="text-slate-400">{new Date(b.acceptedAt).toLocaleTimeString('en-IN')}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No bids placed on this listing yet.</p>
                )}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between">
              <Link
                href={`/auctions/${inspectListing.id}`}
                target="_blank"
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1"
              >
                Open Live Auction View <ExternalLink className="w-3.5 h-3.5" />
              </Link>
              <button
                onClick={() => setInspectListing(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Moderate Status Modal */}
      {moderateModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              Change Status to {moderateModal.targetStatus}
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              Updating moderation status for listing: <strong>{moderateModal.title}</strong>
            </p>
            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                Moderation Reason / Internal Notes
              </label>
              <textarea
                value={moderateReason}
                onChange={(e) => setModerateReason(e.target.value)}
                placeholder="Provide reason for policy compliance or seller notification"
                rows={3}
                className="w-full text-sm p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setModerateModal(null)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={handleModerateSubmit}
                disabled={actionLoading}
                className="px-5 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm transition flex items-center gap-2"
              >
                {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Confirm Status Change
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Delete Listing</h3>
            <p className="text-sm text-slate-500 mb-4">
              Are you sure you want to permanently delete <strong>{deleteModal.title}</strong>? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setDeleteModal(null)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteListing}
                disabled={actionLoading}
                className="px-5 py-2 text-sm font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-sm transition flex items-center gap-2"
              >
                {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
