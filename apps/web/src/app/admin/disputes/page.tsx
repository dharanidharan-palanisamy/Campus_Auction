'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { API_BASE } from '@/lib/api';
import {
  AlertTriangle,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  User,
  Package,
  FileText,
  MessageSquare
} from 'lucide-react';

export default function AdminDisputesPage() {
  const [disputes, setDisputes] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(12);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusTab, setStatusTab] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  // Resolution / Inspect Modal
  const [selectedDispute, setSelectedDispute] = useState<any | null>(null);
  const [inspectLoading, setInspectLoading] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [newPriority, setNewPriority] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [resolutionReason, setResolutionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedDispute) {
        setSelectedDispute(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedDispute]);


  const fetchDisputes = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('campus_admin_token') || localStorage.getItem('campus_token');
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        status: statusTab,
        priority: priorityFilter,
        search
      });

      const res = await fetch(`${API_BASE}/admin/disputes?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDisputes(data.data || []);
        if (data.pagination) {
          setTotal(data.pagination.total);
          setTotalPages(data.pagination.totalPages);
        }
      }
    } catch (err) {
      console.error('Failed to load disputes', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDisputes();
  }, [page, statusTab, priorityFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchDisputes();
  };

  const handleOpenInspect = async (id: string) => {
    try {
      setInspectLoading(true);
      const token = localStorage.getItem('campus_admin_token') || localStorage.getItem('campus_token');
      const res = await fetch(`${API_BASE}/admin/disputes/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const d = data.data;
        setSelectedDispute(d);
        setNewStatus(d.status);
        setNewPriority(d.priority);
        setInternalNotes(d.internalNotes || '');
        setResolutionReason(d.resolutionReason || '');
      }
    } catch (err) {
      console.error('Failed to load dispute details', err);
    } finally {
      setInspectLoading(false);
    }
  };

  const handleSaveResolution = async () => {
    if (!selectedDispute) return;
    if (['RESOLVED', 'REJECTED'].includes(newStatus) && !resolutionReason.trim()) {
      alert('Please enter a resolution explanation or findings to conclude this dispute.');
      return;
    }

    try {
      setActionLoading(true);
      const token = localStorage.getItem('campus_admin_token') || localStorage.getItem('campus_token');
      const res = await fetch(`${API_BASE}/admin/disputes/${selectedDispute.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          status: newStatus,
          priority: newPriority,
          internalNotes,
          resolutionReason
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSelectedDispute(null);
        await fetchDisputes();
      } else {
        alert(data.message || 'Failed to update dispute');
      }
    } catch (err: any) {
      alert(err.message || 'Network error');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Dispute & Safety Reports</h1>
          <p className="text-sm text-slate-500">
            Investigate campus disputes, item discrepancies, no-shows, and safety reports.
          </p>
        </div>
        <div className="text-sm font-semibold text-slate-600 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
          Active Inquiries: <span className="font-bold text-indigo-600">{total}</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200">
        {[
          { key: 'ALL', label: 'All Reports' },
          { key: 'OPEN', label: 'Open' },
          { key: 'UNDER_REVIEW', label: 'Under Review' },
          { key: 'WAITING_FOR_INFO', label: 'Waiting for Info' },
          { key: 'RESOLVED', label: 'Resolved' },
          { key: 'REJECTED', label: 'Rejected / Dismissed' },
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

      {/* Search & Priority Filter Bar */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center gap-3 sm:gap-4">
        <form onSubmit={handleSearch} className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by description, reason, reporter, or reported alias..."
            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </form>

        <div className="flex items-center gap-2 sm:gap-3 w-full md:w-auto">
          <select
            value={priorityFilter}
            onChange={(e) => {
              setPriorityFilter(e.target.value);
              setPage(1);
            }}
            className="text-xs sm:text-sm py-2 px-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 flex-1 md:flex-none"
          >
            <option value="ALL">All Priorities</option>
            <option value="URGENT">🔴 Urgent</option>
            <option value="HIGH">🟠 High</option>
            <option value="MEDIUM">🟡 Medium</option>
            <option value="LOW">⚪ Low</option>
          </select>

          <button
            onClick={() => {
              setSearch('');
              setPriorityFilter('ALL');
              setStatusTab('ALL');
              setPage(1);
            }}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 px-3 py-2 rounded-xl hover:bg-slate-100 transition whitespace-nowrap"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Disputes View */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-2" />
            <p className="text-sm font-medium">Loading dispute docket...</p>
          </div>
        ) : disputes.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <ShieldAlert className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="font-semibold text-slate-600">No disputes match your filter criteria.</p>
          </div>
        ) : (
          <>
            {/* 1. Mobile Cards (< 768px) */}
            <div className="md:hidden divide-y divide-slate-100">
              {disputes.map((d) => (
                <div key={d.id} className="p-4 space-y-3 hover:bg-slate-50/60 transition">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="font-bold text-sm text-slate-900 truncate">{d.reason}</h4>
                      <span className="font-mono text-[10px] text-slate-400">ID: {d.id.slice(0, 8)}...</span>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        d.priority === 'URGENT'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : d.priority === 'HIGH'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                        {d.priority}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        d.status === 'RESOLVED'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : d.status === 'OPEN'
                          ? 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse'
                          : d.status === 'UNDER_REVIEW'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        {d.status}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Reporter</span>
                      {d.reporter ? (
                        <Link href={`/admin/students/${d.reporter.id}`} className="font-bold text-indigo-600 truncate block">
                          @{d.reporter.campusAlias}
                        </Link>
                      ) : (
                        <span className="text-slate-500">System</span>
                      )}
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Reported Party</span>
                      {d.reportedUser ? (
                        <Link href={`/admin/students/${d.reportedUser.id}`} className="font-bold text-rose-600 truncate block">
                          @{d.reportedUser.campusAlias}
                        </Link>
                      ) : (
                        <span className="text-slate-400 italic">None</span>
                      )}
                    </div>
                    <div className="col-span-2 pt-1 border-t border-slate-200/60">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Context / Item</span>
                      {d.listing ? (
                        <Link href={`/auctions/${d.listing.id}`} target="_blank" className="font-semibold text-slate-800 hover:text-indigo-600 truncate block">
                          📦 {d.listing.title}
                        </Link>
                      ) : (
                        <span className="text-slate-400 italic">Direct User Report</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-slate-400">
                      {new Date(d.createdAt).toLocaleDateString('en-IN')}
                    </span>
                    <button
                      onClick={() => handleOpenInspect(d.id)}
                      className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-xl text-xs transition inline-flex items-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5" /> Review & Resolve
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* 2. Tablet, Laptop & Desktop Table (>= 768px) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/75 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Dispute ID / Reason</th>
                    <th className="py-3 px-4">Reporter</th>
                    <th className="py-3 px-4">Reported Party</th>
                    <th className="py-3 px-4">Context / Listing</th>
                    <th className="py-3 px-4">Priority</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {disputes.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3.5 px-4 max-w-xs">
                        <p className="font-bold text-slate-900 truncate">{d.reason}</p>
                        <span className="font-mono text-[11px] text-slate-400">{d.id.slice(0, 8)}...</span>
                      </td>

                      <td className="py-3.5 px-4 text-xs">
                        {d.reporter ? (
                          <Link
                            href={`/admin/students/${d.reporter.id}`}
                            className="font-semibold text-indigo-600 hover:text-indigo-800 block"
                          >
                            @{d.reporter.campusAlias}
                          </Link>
                        ) : (
                          <span className="text-slate-400">System</span>
                        )}
                        <span className="text-[11px] text-slate-400">ID: {d.reporter?.studentId}</span>
                      </td>

                      <td className="py-3.5 px-4 text-xs">
                        {d.reportedUser ? (
                          <Link
                            href={`/admin/students/${d.reportedUser.id}`}
                            className="font-semibold text-rose-600 hover:text-rose-800 block"
                          >
                            @{d.reportedUser.campusAlias}
                          </Link>
                        ) : (
                          <span className="text-slate-400 italic">None</span>
                        )}
                        <span className="text-[11px] text-slate-400">ID: {d.reportedUser?.studentId}</span>
                      </td>

                      <td className="py-3.5 px-4 text-xs text-slate-600 max-w-xs truncate">
                        {d.listing ? (
                          <Link
                            href={`/auctions/${d.listing.id}`}
                            target="_blank"
                            className="hover:text-indigo-600 font-medium"
                          >
                            {d.listing.title}
                          </Link>
                        ) : (
                          <span className="text-slate-400 italic">Direct User Report</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${
                          d.priority === 'URGENT'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : d.priority === 'HIGH'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}>
                          {d.priority}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                          d.status === 'RESOLVED'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : d.status === 'OPEN'
                            ? 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse'
                            : d.status === 'UNDER_REVIEW'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          {d.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-xs text-slate-500 whitespace-nowrap">
                        {new Date(d.createdAt).toLocaleDateString('en-IN')}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleOpenInspect(d.id)}
                          className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-xl text-xs transition inline-flex items-center gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5" /> Review
                        </button>
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
            Page <span className="font-bold text-slate-800">{page}</span> of <span className="font-bold text-slate-800">{totalPages || 1}</span> ({total} reports total)
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

      {/* Review / Resolution Modal */}
      {selectedDispute && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
          onClick={() => setSelectedDispute(null)}
        >
          <div 
            className="bg-white rounded-2xl p-4 sm:p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4 pb-3 border-b border-slate-100">
              <div>
                <span className="text-xs font-mono text-slate-400">DISPUTE #{selectedDispute.id}</span>
                <h3 className="text-xl font-bold text-slate-900 mt-0.5">{selectedDispute.reason}</h3>
              </div>
              <button
                onClick={() => setSelectedDispute(null)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-sm">
              {/* Complaint Description */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Report Description</h4>
                <p className="mt-1 text-slate-800 bg-slate-50 p-3.5 rounded-xl border border-slate-200 whitespace-pre-wrap">
                  {selectedDispute.description}
                </p>
              </div>

              {/* Involving Parties */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <h4 className="text-xs font-bold text-slate-400 uppercase mb-1">Reporter</h4>
                  <p className="font-bold text-slate-900">{selectedDispute.reporter?.fullName}</p>
                  <p className="text-xs text-slate-500">@{selectedDispute.reporter?.campusAlias}</p>
                  <p className="text-xs text-slate-400">ID: {selectedDispute.reporter?.studentId}</p>
                  <Link
                    href={`/admin/students/${selectedDispute.reporter?.id}`}
                    target="_blank"
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold mt-1 inline-block"
                  >
                    View Student Dossier →
                  </Link>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <h4 className="text-xs font-bold text-slate-400 uppercase mb-1">Reported Party</h4>
                  {selectedDispute.reportedUser ? (
                    <>
                      <p className="font-bold text-slate-900">{selectedDispute.reportedUser?.fullName}</p>
                      <p className="text-xs text-slate-500">@{selectedDispute.reportedUser?.campusAlias}</p>
                      <p className="text-xs text-slate-400">ID: {selectedDispute.reportedUser?.studentId}</p>
                      <Link
                        href={`/admin/students/${selectedDispute.reportedUser?.id}`}
                        target="_blank"
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold mt-1 inline-block"
                      >
                        View Student Dossier →
                      </Link>
                    </>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No specific student reported.</p>
                  )}
                </div>
              </div>

              {/* Status and Priority Selectors */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Investigation Status</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full text-sm p-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="OPEN">OPEN (Needs Review)</option>
                    <option value="UNDER_REVIEW">UNDER_REVIEW (Investigating)</option>
                    <option value="WAITING_FOR_INFO">WAITING_FOR_INFO (Awaiting student reply)</option>
                    <option value="RESOLVED">RESOLVED (Resolved amicably / action taken)</option>
                    <option value="REJECTED">REJECTED (Invalid / False report)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Case Priority</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                    className="w-full text-sm p-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>

              {/* Internal Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Internal Administrative Notes</label>
                <textarea
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  placeholder="Private findings, campus security contacts, handover evidence..."
                  rows={2}
                  className="w-full text-sm p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Resolution Explanation */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Resolution Explanation / Student Notification Message
                </label>
                <textarea
                  value={resolutionReason}
                  onChange={(e) => setResolutionReason(e.target.value)}
                  placeholder="Explain resolution outcome. Sent to reporter student upon closure."
                  rows={2}
                  className="w-full text-sm p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                onClick={() => setSelectedDispute(null)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Close
              </button>
              <button
                onClick={handleSaveResolution}
                disabled={actionLoading}
                className="px-5 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm transition flex items-center gap-2"
              >
                {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Save Docket & Send Notice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

