'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { 
  Users, 
  ShieldCheck, 
  Ban, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Trash2, 
  Search, 
  Check, 
  X, 
  AlertTriangle, 
  Loader2, 
  UserX, 
  UserCheck 
} from 'lucide-react';

export default function AdminPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'ALL' | 'VERIFIED' | 'PENDING' | 'SUSPENDED'>('ALL');

  // Delete modal state
  const [selectedStudentForDelete, setSelectedStudentForDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('campus_token') : '';

  const loadAdminData = async () => {
    try {
      const [statsRes, usersRes, logsRes] = await Promise.all([
        fetch('http://localhost:4000/api/v1/admin/stats', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('http://localhost:4000/api/v1/admin/users', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('http://localhost:4000/api/v1/admin/audit-logs', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      const sData = await statsRes.json();
      const uData = await usersRes.json();
      const lData = await logsRes.json();

      if (sData.success) setStats(sData.data);
      if (uData.success) setUsers(uData.data);
      if (lData.success) setAuditLogs(lData.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  // 1. Toggle Verification (Verify / Unverify Student)
  const toggleVerification = async (studentId: string, currentVerified: boolean) => {
    try {
      const res = await fetch(`http://localhost:4000/api/v1/admin/users/${studentId}/verify`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ isVerified: !currentVerified })
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage({
          type: 'success',
          text: !currentVerified ? 'Student identity successfully verified' : 'Student verification revoked'
        });
        loadAdminData();
      } else {
        setActionMessage({ type: 'error', text: data.message || 'Action failed' });
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Network error' });
    }
  };

  // 2. Toggle Suspension (Suspend / Reactivate Student)
  const toggleSuspension = async (studentId: string, currentSuspended: boolean) => {
    try {
      const res = await fetch(`http://localhost:4000/api/v1/admin/users/${studentId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ isSuspended: !currentSuspended })
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage({
          type: 'success',
          text: !currentSuspended ? 'Student account suspended' : 'Student account reactivated'
        });
        loadAdminData();
      } else {
        setActionMessage({ type: 'error', text: data.message || 'Action failed' });
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Network error' });
    }
  };

  // 3. Delete Student Account
  const handleDeleteStudent = async () => {
    if (!selectedStudentForDelete) return;
    setIsDeleting(true);

    try {
      const res = await fetch(`http://localhost:4000/api/v1/admin/users/${selectedStudentForDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage({
          type: 'success',
          text: `Student ${selectedStudentForDelete.fullName} successfully deleted`
        });
        setSelectedStudentForDelete(null);
        loadAdminData();
      } else {
        setActionMessage({ type: 'error', text: data.message || 'Failed to delete student' });
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Network error' });
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter students
  const filteredUsers = users.filter((u) => {
    const matchesSearch = 
      u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.campusAlias.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.studentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (filterTab === 'VERIFIED') return u.isEmailVerified && !u.isSuspended;
    if (filterTab === 'PENDING') return !u.isEmailVerified;
    if (filterTab === 'SUSPENDED') return u.isSuspended;

    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-purple-100 text-purple-800 text-xs font-bold uppercase tracking-wider mb-2">
            <ShieldCheck className="w-4 h-4 text-purple-600" />
            University Administration
          </div>
          <h1 className="text-3xl font-black text-slate-900">Student Verification & Identity Portal</h1>
          <p className="text-sm text-slate-500 mt-1">
            Verify student identities, moderate institutional access, and manage student accounts
          </p>
        </div>
        <button
          onClick={loadAdminData}
          className="self-start sm:self-auto flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-sm"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Students
        </button>
      </div>

      {/* Notifications */}
      {actionMessage && (
        <div className={`mb-6 p-4 rounded-2xl border text-xs font-semibold flex items-center justify-between ${
          actionMessage.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <div className="flex items-center gap-2">
            {actionMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button onClick={() => setActionMessage(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Student-Centric KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Total Enrolled</span>
            <Users className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="mt-3 text-3xl font-black text-slate-900">{stats?.totalStudents ?? '...'}</div>
          <span className="text-xs text-slate-400 mt-1 block">Registered students</span>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Verified Identity</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="mt-3 text-3xl font-black text-emerald-600">{stats?.verifiedStudents ?? '...'}</div>
          <span className="text-xs text-slate-400 mt-1 block">Eligible to buy & sell</span>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Pending Review</span>
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <div className="mt-3 text-3xl font-black text-amber-600">{stats?.pendingVerification ?? '...'}</div>
          <span className="text-xs text-slate-400 mt-1 block">Requires admin sign-off</span>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Suspended</span>
            <Ban className="w-5 h-5 text-rose-600" />
          </div>
          <div className="mt-3 text-3xl font-black text-rose-600">{stats?.suspendedStudents ?? '...'}</div>
          <span className="text-xs text-slate-400 mt-1 block">Access restricted</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Student Verification & Account Management (8 cols) */}
        <div className="lg:col-span-8 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-lg text-slate-900">Student Directory & Verification</h3>
              <p className="text-xs text-slate-500">Verify student identities or moderate account permissions</p>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search name, ID, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
            {(['ALL', 'VERIFIED', 'PENDING', 'SUSPENDED'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilterTab(tab)}
                className={`px-3 py-1.5 rounded-xl font-bold transition ${
                  filterTab === tab
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab === 'ALL' && 'All Students'}
                {tab === 'VERIFIED' && 'Verified Only'}
                {tab === 'PENDING' && 'Pending Verification'}
                {tab === 'SUSPENDED' && 'Suspended'}
              </button>
            ))}
            <span className="ml-auto text-[11px] text-slate-400">
              Showing {filteredUsers.length} student(s)
            </span>
          </div>

          {/* Students Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-400 uppercase font-bold tracking-wider border-y border-slate-100">
                <tr>
                  <th className="py-3 px-3">Student</th>
                  <th className="py-3 px-3">Campus ID / Email</th>
                  <th className="py-3 px-3">Verification</th>
                  <th className="py-3 px-3">Account</th>
                  <th className="py-3 px-3 text-right">Admin Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No students found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/50">
                      {/* Name & Alias */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center shrink-0">
                            {u.campusAlias?.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block">{u.fullName}</span>
                            <span className="text-[11px] text-slate-400 font-medium">@{u.campusAlias}</span>
                          </div>
                        </div>
                      </td>

                      {/* ID & Email */}
                      <td className="py-3 px-3">
                        <span className="font-mono text-slate-800 font-semibold block">{u.studentId}</span>
                        <span className="text-[11px] text-slate-500">{u.email}</span>
                      </td>

                      {/* Verification Status */}
                      <td className="py-3 px-3">
                        {u.isEmailVerified ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Check className="w-3 h-3" /> Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="w-3 h-3" /> Pending
                          </span>
                        )}
                      </td>

                      {/* Suspension Status */}
                      <td className="py-3 px-3">
                        {u.isSuspended ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[10px] bg-rose-50 text-rose-700 border border-rose-200">
                            <Ban className="w-3 h-3" /> Suspended
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[10px] bg-slate-100 text-slate-700">
                            Active
                          </span>
                        )}
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* 1. Toggle Verify */}
                          <button
                            onClick={() => toggleVerification(u.id, u.isEmailVerified)}
                            title={u.isEmailVerified ? 'Revoke verification' : 'Verify student'}
                            className={`p-1.5 rounded-lg border font-bold text-[11px] transition flex items-center gap-1 ${
                              u.isEmailVerified
                                ? 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                            }`}
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            {u.isEmailVerified ? 'Unverify' : 'Verify'}
                          </button>

                          {/* 2. Toggle Suspend */}
                          <button
                            onClick={() => toggleSuspension(u.id, u.isSuspended)}
                            title={u.isSuspended ? 'Reactivate student account' : 'Suspend student account'}
                            className={`p-1.5 rounded-lg border font-bold text-[11px] transition flex items-center gap-1 ${
                              u.isSuspended
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                                : 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
                            }`}
                          >
                            <Ban className="w-3.5 h-3.5" />
                            {u.isSuspended ? 'Reactivate' : 'Suspend'}
                          </button>

                          {/* 3. Delete Student */}
                          <button
                            onClick={() => setSelectedStudentForDelete(u)}
                            title="Delete student account"
                            className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Security & Moderation Audit Logs (4 cols) */}
        <div className="lg:col-span-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div>
            <h3 className="font-bold text-lg text-slate-900">Admin Audit Logs</h3>
            <p className="text-xs text-slate-500">Security history of student verification and moderations</p>
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {auditLogs.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No moderation logs recorded yet.</p>
            ) : (
              auditLogs.map((log) => (
                <div key={log.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs space-y-1">
                  <div className="flex items-center justify-between font-bold text-slate-800">
                    <span className="font-mono text-[11px] text-purple-700">{log.action}</span>
                    <span className="text-[10px] text-slate-400">{new Date(log.createdAt).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-slate-600 text-[11px]">Target: {log.targetType}</p>
                  {log.actor && (
                    <span className="text-[10px] text-slate-400 block">By Admin: @{log.actor.campusAlias}</span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ===================== DELETE STUDENT CONFIRMATION MODAL ===================== */}
      {selectedStudentForDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl p-6 sm:p-7 space-y-5">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <UserX className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-xl font-black text-slate-900">
                Delete Student Account?
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Are you sure you want to delete <strong className="text-slate-800">{selectedStudentForDelete.fullName}</strong> ({selectedStudentForDelete.studentId})?
              </p>
              <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-[11px] text-rose-700 text-left font-medium">
                ⚠️ This will permanently remove the student's campus profile, bids, active listings, and bookmarks. This action cannot be undone.
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedStudentForDelete(null)}
                disabled={isDeleting}
                className="py-2.5 px-4 rounded-xl border border-slate-200 font-bold text-xs text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteStudent}
                disabled={isDeleting}
                className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-200 transition flex items-center justify-center gap-1.5"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    Confirm Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
