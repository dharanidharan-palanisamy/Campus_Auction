'use client';

import React, { useEffect, useState } from 'react';
import {
  History,
  Search,
  Filter,
  Download,
  Shield,
  Eye,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [targetTypeFilter, setTargetTypeFilter] = useState('');

  // Inspector modal
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('campus_token');
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        action: actionFilter,
        targetType: targetTypeFilter,
        search
      });

      const res = await fetch(`${API_BASE}/admin/audit-logs?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setLogs(data.data || []);
        if (data.pagination) {
          setTotal(data.pagination.total);
          setTotalPages(data.pagination.totalPages);
        }
      }
    } catch (err) {
      console.error('Failed to load audit logs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, actionFilter, targetTypeFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  const handleExportCSV = async () => {
    try {
      const token = localStorage.getItem('campus_token');
      const res = await fetch(`${API_BASE}/admin/audit-logs/export`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit_logs_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      alert('Failed to export audit logs');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Security Audit Trail</h1>
          <p className="text-sm text-slate-500">
            Immutable, append-only log of every administrative action, verification, suspension, and policy enforcement.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold shadow-sm transition"
          >
            <Download className="w-3.5 h-3.5" /> Export Audit CSV
          </button>
          <div className="text-sm font-semibold text-slate-600 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
            Total Logged Events: <span className="font-bold text-indigo-600">{total}</span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-4">
        <form onSubmit={handleSearch} className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by action, payload, actor alias..."
            className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </form>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            className="text-xs py-2 px-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700"
          >
            <option value="">All Actions</option>
            <option value="VERIFY_STUDENT">VERIFY_STUDENT</option>
            <option value="SUSPEND_STUDENT">SUSPEND_STUDENT</option>
            <option value="REACTIVATE_STUDENT">REACTIVATE_STUDENT</option>
            <option value="REJECT_STUDENT_VERIFICATION">REJECT_STUDENT_VERIFICATION</option>
            <option value="DELETE_STUDENT">DELETE_STUDENT</option>
            <option value="MODERATE_LISTING">MODERATE_LISTING</option>
            <option value="UPDATE_DISPUTE">UPDATE_DISPUTE</option>
            <option value="CREATE_CATEGORY">CREATE_CATEGORY</option>
            <option value="BROADCAST_NOTIFICATION">BROADCAST_NOTIFICATION</option>
            <option value="UPDATE_SETTINGS">UPDATE_SETTINGS</option>
          </select>

          <select
            value={targetTypeFilter}
            onChange={(e) => {
              setTargetTypeFilter(e.target.value);
              setPage(1);
            }}
            className="text-xs py-2 px-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700"
          >
            <option value="">All Target Types</option>
            <option value="USER">USER</option>
            <option value="LISTING">LISTING</option>
            <option value="CATEGORY">CATEGORY</option>
            <option value="DISPUTE">DISPUTE</option>
            <option value="NOTIFICATION">NOTIFICATION</option>
            <option value="SETTINGS">SETTINGS</option>
          </select>

          <button
            onClick={() => {
              setSearch('');
              setActionFilter('');
              setTargetTypeFilter('');
              setPage(1);
            }}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 px-3 py-2 rounded-xl hover:bg-slate-100 transition whitespace-nowrap"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-2" />
            <p className="text-sm font-medium">Verifying immutable audit ledger...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <History className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="font-semibold text-slate-600">No audit events match your filter query.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Target Type</th>
                  <th className="py-3 px-4">Target ID</th>
                  <th className="py-3 px-4">Payload Summary</th>
                  <th className="py-3 px-4 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-4 text-xs text-slate-500 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{new Date(log.createdAt).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', day: 'numeric', month: 'short' })}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-xs font-semibold text-slate-800">
                      @{log.actor?.campusAlias || 'System'}
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                        {log.action}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-xs font-medium text-slate-600">
                      {log.targetType || 'SYSTEM'}
                    </td>

                    <td className="py-3 px-4 font-mono text-xs text-slate-400">
                      {log.targetId ? `${log.targetId.slice(0, 8)}...` : '—'}
                    </td>

                    <td className="py-3 px-4 text-xs text-slate-600 max-w-xs truncate">
                      {log.payload ? log.payload.slice(0, 60) : '—'}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                        title="View Full Payload"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
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
            Page {page} of {totalPages} ({total} audit events total)
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

      {/* Inspect Log Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-xl w-full shadow-2xl border border-slate-200">
            <div className="flex items-start justify-between mb-4 pb-3 border-b border-slate-100">
              <div>
                <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded">
                  {selectedLog.action}
                </span>
                <p className="text-xs text-slate-400 mt-1">Audit Record ID: {selectedLog.id}</p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-slate-400 font-semibold uppercase">Actor</span>
                  <p className="text-slate-900 font-bold">@{selectedLog.actor?.campusAlias || 'System'}</p>
                  <p className="text-slate-500">{selectedLog.actor?.email}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold uppercase">Timestamp</span>
                  <p className="text-slate-900 font-bold">{new Date(selectedLog.createdAt).toLocaleString('en-IN')}</p>
                </div>
              </div>

              <div>
                <span className="text-slate-400 font-semibold uppercase">Target Entity</span>
                <p className="text-slate-800 font-mono">
                  {selectedLog.targetType} {selectedLog.targetId ? `(${selectedLog.targetId})` : ''}
                </p>
              </div>

              <div>
                <span className="text-slate-400 font-semibold uppercase">Full Event Payload</span>
                <pre className="mt-1 p-3 bg-slate-900 text-emerald-400 rounded-xl font-mono text-xs overflow-x-auto max-h-60 overflow-y-auto whitespace-pre-wrap">
                  {(() => {
                    try {
                      return JSON.stringify(JSON.parse(selectedLog.payload), null, 2);
                    } catch {
                      return selectedLog.payload || 'No payload details';
                    }
                  })()}
                </pre>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
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
