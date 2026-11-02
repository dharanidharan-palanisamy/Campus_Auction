'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAdminSocket } from '@/hooks/useAdminSocket';
import { 
  Users, 
  Search, 
  UserCheck, 
  UserX, 
  Clock, 
  Ban, 
  CheckCircle2, 
  AlertCircle, 
  Download, 
  Eye, 
  Trash2, 
  X, 
  Check, 
  AlertTriangle, 
  Loader2, 
  ChevronLeft, 
  ChevronRight,
  Filter,
  RefreshCw,
  SlidersHorizontal
} from 'lucide-react';
import { Suspense } from 'react';

export default function StudentsManagementPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading student directory...</div>}>
      <StudentsManagementContent />
    </Suspense>
  );
}

function StudentsManagementContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get('status') || 'ALL';

  const [students, setStudents] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusTab, setStatusTab] = useState<'ALL' | 'VERIFIED' | 'PENDING' | 'SUSPENDED'>(
    (initialStatus as any) || 'ALL'
  );
  const [department, setDepartment] = useState('');
  const [sort, setSort] = useState('newest');

  // Modals state
  const [selectedForVerify, setSelectedForVerify] = useState<any | null>(null);
  const [verifyNotes, setVerifyNotes] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const [selectedForReject, setSelectedForReject] = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  const [selectedForSuspend, setSelectedForSuspend] = useState<any | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [suspendDuration, setSuspendDuration] = useState('7');
  const [isSuspending, setIsSuspending] = useState(false);

  const [selectedForDelete, setSelectedForDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const token = typeof window !== 'undefined' ? (localStorage.getItem('campus_admin_token') || localStorage.getItem('campus_token')) : '';

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusTab !== 'ALL') params.set('status', statusTab);
      if (department) params.set('department', department);
      params.set('sort', sort);
      params.set('page', page.toString());
      params.set('limit', limit.toString());

      const res = await fetch(`http://localhost:4000/api/v1/admin/students?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setStudents(data.data);
        setTotal(data.pagination.total);
        setTotalPages(data.pagination.totalPages);
      } else {
        setToastMessage({ type: 'error', text: data.message || 'Failed to fetch students' });
      }
    } catch (err: any) {
      setToastMessage({ type: 'error', text: err.message || 'Network error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [search, statusTab, department, sort, page, limit]);

  // Real-time dynamic sync when students register in client panel
  const handleLiveEvent = useCallback((event: any) => {
    if (event.type === 'STUDENT_REGISTERED' || event.type === 'STUDENT_STATUS') {
      fetchStudents();
    }
  }, [search, statusTab, department, sort, page, limit]);

  useAdminSocket(handleLiveEvent);

  // Close modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedForVerify) setSelectedForVerify(null);
        if (selectedForReject) setSelectedForReject(null);
        if (selectedForSuspend) setSelectedForSuspend(null);
        if (selectedForDelete) setSelectedForDelete(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedForVerify, selectedForReject, selectedForSuspend, selectedForDelete]);

  useEffect(() => {
    const qStatus = searchParams.get('status');
    if (qStatus && ['VERIFIED', 'PENDING', 'SUSPENDED'].includes(qStatus)) {
      setStatusTab(qStatus as any);
      setPage(1);
    } else if (!qStatus || qStatus === 'ALL') {
      setStatusTab('ALL');
      setPage(1);
    }
  }, [searchParams]);

  const handleTabChange = (tab: 'ALL' | 'VERIFIED' | 'PENDING' | 'SUSPENDED') => {
    setStatusTab(tab);
    setPage(1);
    if (tab === 'ALL') {
      router.push('/admin/students');
    } else {
      router.push(`/admin/students?status=${tab}`);
    }
  };

  // Actions
  const handleVerifyStudent = async () => {
    if (!selectedForVerify) return;
    setIsVerifying(true);
    try {
      const res = await fetch(`http://localhost:4000/api/v1/admin/students/${selectedForVerify.id}/verify`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ notes: verifyNotes || 'Verified by University Administrator' })
      });
      const data = await res.json();
      if (data.success) {
        setToastMessage({ type: 'success', text: `Student ${selectedForVerify.fullName} verified successfully!` });
        setSelectedForVerify(null);
        setVerifyNotes('');
        fetchStudents();
      } else {
        setToastMessage({ type: 'error', text: data.message || 'Verification failed' });
      }
    } catch (err: any) {
      setToastMessage({ type: 'error', text: err.message || 'Network error' });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRejectVerification = async () => {
    if (!selectedForReject || !rejectReason.trim()) return;
    setIsRejecting(true);
    try {
      const res = await fetch(`http://localhost:4000/api/v1/admin/students/${selectedForReject.id}/reject-verification`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reason: rejectReason.trim() })
      });
      const data = await res.json();
      if (data.success) {
        setToastMessage({ type: 'success', text: `Verification rejected for ${selectedForReject.fullName}` });
        setSelectedForReject(null);
        setRejectReason('');
        fetchStudents();
      } else {
        setToastMessage({ type: 'error', text: data.message || 'Rejection failed' });
      }
    } catch (err: any) {
      setToastMessage({ type: 'error', text: err.message || 'Network error' });
    } finally {
      setIsRejecting(false);
    }
  };

  const handleSuspendStudent = async () => {
    if (!selectedForSuspend || !suspendReason.trim()) return;
    setIsSuspending(true);
    try {
      const res = await fetch(`http://localhost:4000/api/v1/admin/students/${selectedForSuspend.id}/suspend`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          reason: suspendReason.trim(),
          durationDays: parseInt(suspendDuration, 10) || 7
        })
      });
      const data = await res.json();
      if (data.success) {
        setToastMessage({ type: 'success', text: `Student account for ${selectedForSuspend.fullName} suspended` });
        setSelectedForSuspend(null);
        setSuspendReason('');
        fetchStudents();
      } else {
        setToastMessage({ type: 'error', text: data.message || 'Suspension failed' });
      }
    } catch (err: any) {
      setToastMessage({ type: 'error', text: err.message || 'Network error' });
    } finally {
      setIsSuspending(false);
    }
  };

  const handleReactivateStudent = async (student: any) => {
    try {
      const res = await fetch(`http://localhost:4000/api/v1/admin/students/${student.id}/reactivate`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reason: 'Reactivated by administration' })
      });
      const data = await res.json();
      if (data.success) {
        setToastMessage({ type: 'success', text: `Student account for ${student.fullName} reactivated` });
        fetchStudents();
      } else {
        setToastMessage({ type: 'error', text: data.message || 'Reactivation failed' });
      }
    } catch (err: any) {
      setToastMessage({ type: 'error', text: err.message || 'Network error' });
    }
  };

  const handleDeleteStudent = async () => {
    if (!selectedForDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`http://localhost:4000/api/v1/admin/students/${selectedForDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setToastMessage({ type: 'success', text: `Student ${selectedForDelete.fullName} permanently deleted` });
        setSelectedForDelete(null);
        fetchStudents();
      } else {
        setToastMessage({ type: 'error', text: data.message || 'Failed to delete student' });
      }
    } catch (err: any) {
      setToastMessage({ type: 'error', text: err.message || 'Network error' });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExportCSV = () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (statusTab !== 'ALL') params.set('status', statusTab);
    if (department) params.set('department', department);
    window.open(`http://localhost:4000/api/v1/admin/students/export?${params.toString()}`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Export Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-7 h-7 text-purple-600" />
            Student Account Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Search, verify, inspect, moderate, and manage every student registered on CampusBid
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold transition shadow-sm"
          >
            <Download className="w-4 h-4 text-purple-600" />
            Export CSV
          </button>
          <button
            onClick={fetchStudents}
            title="Refresh directory"
            className="p-2 bg-white border border-slate-200 text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-50 transition shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-purple-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className={`p-4 rounded-2xl border text-xs font-semibold flex items-center justify-between shadow-sm animate-fade-in ${
          toastMessage.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <div className="flex items-center gap-2">
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600" />
            )}
            <span>{toastMessage.text}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter Tabs Bar */}
      <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1.5 sm:pb-0 scrollbar-none">
        {(['ALL', 'VERIFIED', 'PENDING', 'SUSPENDED'] as const).map((tab) => {
          const isActive = statusTab === tab;
          return (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className={`flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                isActive
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-900/20'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-purple-300 hover:text-purple-600'
              }`}
            >
              {tab === 'ALL' && <Users className="w-3.5 h-3.5 shrink-0" />}
              {tab === 'VERIFIED' && <UserCheck className="w-3.5 h-3.5 shrink-0" />}
              {tab === 'PENDING' && <Clock className="w-3.5 h-3.5 shrink-0" />}
              {tab === 'SUSPENDED' && <Ban className="w-3.5 h-3.5 shrink-0" />}

              <span>
                {tab === 'ALL' && 'All Students'}
                {tab === 'VERIFIED' && 'Verified Students'}
                {tab === 'PENDING' && 'Pending Verification'}
                {tab === 'SUSPENDED' && 'Suspended'}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search and Advanced Filter Bar */}
      <div className="p-3 sm:p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search student name, email, ID, or alias..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* Department & Sort Filters */}
        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2">
          <select
            value={department}
            onChange={(e) => {
              setDepartment(e.target.value);
              setPage(1);
            }}
            className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-2.5 sm:px-3 py-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-400 w-full sm:w-auto"
          >
            <option value="">All Departments</option>
            <option value="Computer Science">Computer Science & Eng.</option>
            <option value="Electrical">Electrical & Electronics</option>
            <option value="Mechanical">Mechanical Engineering</option>
            <option value="Civil">Civil Engineering</option>
            <option value="Information Technology">Information Technology</option>
          </select>

          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              setPage(1);
            }}
            className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-2.5 sm:px-3 py-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-400 w-full sm:w-auto"
          >
            <option value="newest">Recently Registered</option>
            <option value="oldest">Earliest Registered</option>
            <option value="name_asc">Name (A to Z)</option>
            <option value="name_desc">Name (Z to A)</option>
          </select>
        </div>
      </div>

      {/* Main Student Records View */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Loading & Empty States */}
        {loading ? (
          <div className="py-14 text-center text-slate-400">
            <Loader2 className="w-7 h-7 animate-spin text-purple-600 mx-auto mb-2" />
            <p className="text-xs font-semibold">Fetching student records...</p>
          </div>
        ) : students.length === 0 ? (
          <div className="py-14 text-center text-slate-400">
            <Users className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="text-xs font-semibold text-slate-600">No students found matching your criteria.</p>
          </div>
        ) : (
          <>
            {/* 1. MOBILE RESPONSIVE CARDS (Phone / Small Screens < 768px) */}
            <div className="md:hidden divide-y divide-slate-100">
              {students.map((st) => (
                <div key={st.id} className="p-4 space-y-3 hover:bg-slate-50/70 transition">
                  {/* Top: Avatar, Name, and Status Badges */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 font-bold flex items-center justify-center shrink-0 text-sm">
                        {st.campusAlias?.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <Link
                          href={`/admin/students/${st.id}`}
                          className="font-bold text-sm text-slate-900 hover:text-purple-600 transition block truncate"
                        >
                          {st.fullName}
                        </Link>
                        <span className="text-xs text-slate-400 block truncate">
                          @{st.campusAlias}
                        </span>
                      </div>
                    </div>

                    {/* Status Badges */}
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {st.isEmailVerified ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <Check className="w-3 h-3" /> Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-amber-50 text-amber-700 border border-amber-200">
                          <Clock className="w-3 h-3" /> Pending
                        </span>
                      )}
                      {st.isSuspended ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[10px] bg-rose-50 text-rose-700 border border-rose-200">
                          <Ban className="w-3 h-3" /> Suspended
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[10px] bg-slate-100 text-slate-700">
                          Active
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Meta Details Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Student ID</span>
                      <span className="font-mono font-bold text-slate-800 truncate block">{st.studentId}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Email</span>
                      <span className="text-slate-600 truncate block" title={st.email}>{st.email}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Department</span>
                      <span className="text-slate-700 truncate block">{st.department || 'General'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Activity</span>
                      <span className="font-mono text-slate-700 font-semibold">
                        📦 {st._count?.listings || 0} &nbsp;|&nbsp; ⚡ {st._count?.bids || 0}
                      </span>
                    </div>
                  </div>

                  {/* Mobile Actions Bar */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] font-mono text-slate-400">
                      Joined {new Date(st.createdAt).toLocaleDateString()}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Link
                        href={`/admin/students/${st.id}`}
                        className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" /> Details
                      </Link>
                      {!st.isEmailVerified ? (
                        <button
                          onClick={() => setSelectedForVerify(st)}
                          className="px-2.5 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-bold hover:bg-emerald-100 transition flex items-center gap-1"
                        >
                          <UserCheck className="w-3.5 h-3.5" /> Verify
                        </button>
                      ) : (
                        <button
                          onClick={() => setSelectedForReject(st)}
                          className="px-2.5 py-1.5 rounded-xl border border-amber-200 bg-amber-50 text-amber-700 text-xs font-bold hover:bg-amber-100 transition flex items-center gap-1"
                        >
                          <UserX className="w-3.5 h-3.5" /> Revoke
                        </button>
                      )}
                      {!st.isSuspended ? (
                        <button
                          onClick={() => setSelectedForSuspend(st)}
                          className="p-1.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 transition"
                          title="Suspend"
                        >
                          <Ban className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleReactivateStudent(st)}
                          className="p-1.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition"
                          title="Reactivate"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedForDelete(st)}
                        className="p-1.5 rounded-xl border border-slate-200 bg-white hover:bg-rose-50 hover:text-rose-600 text-slate-400 transition"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 2. TABLET, LAPTOP & PC RESPONSIVE DATA TABLE (>= 768px) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[920px]">
                <thead className="bg-slate-50 text-slate-400 uppercase font-bold tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-4">Student</th>
                    <th className="py-3.5 px-4">Student ID / Email</th>
                    <th className="py-3.5 px-4">Department & College</th>
                    <th className="py-3.5 px-4">Verification</th>
                    <th className="py-3.5 px-4">Account Status</th>
                    <th className="py-3.5 px-4 text-center">Activity</th>
                    <th className="py-3.5 px-4">Joined</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {students.map((st) => (
                    <tr key={st.id} className="hover:bg-slate-50/70 transition">
                      {/* Student Identity */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 font-bold flex items-center justify-center shrink-0">
                            {st.campusAlias?.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <Link
                              href={`/admin/students/${st.id}`}
                              className="font-bold text-slate-900 hover:text-purple-600 transition block truncate"
                            >
                              {st.fullName}
                            </Link>
                            <span className="text-[11px] text-slate-400 block truncate">
                              @{st.campusAlias}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* ID & Email */}
                      <td className="py-3 px-4">
                        <span className="font-mono text-slate-900 font-bold block">{st.studentId}</span>
                        <span className="text-[11px] text-slate-500 block truncate max-w-[180px]">{st.email}</span>
                      </td>

                      {/* Department */}
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-700 block truncate max-w-[180px]">
                          {st.department || 'General Engineering'}
                        </span>
                        <span className="text-[10px] text-slate-400 block truncate max-w-[180px]">
                          {st.college || 'Engineering Campus'}
                        </span>
                      </td>

                      {/* Verification Status */}
                      <td className="py-3 px-4">
                        {st.isEmailVerified ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Check className="w-3 h-3" /> Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="w-3 h-3" /> Pending Review
                          </span>
                        )}
                      </td>

                      {/* Account Status */}
                      <td className="py-3 px-4">
                        {st.isSuspended ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-rose-50 text-rose-700 border border-rose-200">
                            <Ban className="w-3 h-3" /> Suspended
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[10px] bg-slate-100 text-slate-700">
                            Active
                          </span>
                        )}
                      </td>

                      {/* Marketplace Activity */}
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center gap-2 font-mono text-[11px] text-slate-600 bg-slate-50 px-2 py-1 rounded-lg">
                          <span title="Listings created">📦 {st._count?.listings || 0}</span>
                          <span className="text-slate-300">|</span>
                          <span title="Bids placed">⚡ {st._count?.bids || 0}</span>
                        </div>
                      </td>

                      {/* Registered Date */}
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                        {new Date(st.createdAt).toLocaleDateString()}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* 1. View Full Profile */}
                          <Link
                            href={`/admin/students/${st.id}`}
                            title="View student profile & activity"
                            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-purple-600 transition"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Link>

                          {/* 2. Verification Action */}
                          {!st.isEmailVerified ? (
                            <button
                              onClick={() => setSelectedForVerify(st)}
                              title="Verify Student Credentials"
                              className="p-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => setSelectedForReject(st)}
                              title="Revoke Verification"
                              className="p-1.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 transition"
                            >
                              <UserX className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* 3. Suspension Action */}
                          {!st.isSuspended ? (
                            <button
                              onClick={() => setSelectedForSuspend(st)}
                              title="Suspend Student Account"
                              className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 transition"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleReactivateStudent(st)}
                              title="Reactivate Student Account"
                              className="p-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* 4. Delete Student */}
                          <button
                            onClick={() => setSelectedForDelete(st)}
                            title="Delete Student"
                            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Pagination Footer - Clean & Responsive across all screen sizes */}
        <div className="p-3 sm:p-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <span className="text-center sm:text-left">
            Showing <span className="font-bold text-slate-800">{students.length}</span> of <span className="font-bold text-slate-800">{total}</span> registered students
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition flex items-center gap-1 font-semibold"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Prev
            </button>
            <span className="font-mono text-slate-700 font-bold px-2">
              Page {page} of {totalPages || 1}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition flex items-center gap-1 font-semibold"
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ===================== VERIFY MODAL ===================== */}
      {selectedForVerify && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl p-6 sm:p-7 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <UserCheck className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-xl font-black text-slate-900">Verify Student Identity</h3>
              <p className="text-xs text-slate-500">
                Grant verified student status to <strong className="text-slate-800">{selectedForVerify.fullName}</strong> ({selectedForVerify.studentId}).
              </p>
            </div>

            <div className="space-y-3 pt-2 text-xs">
              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Verification Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Verified against University ERP registry"
                  value={verifyNotes}
                  onChange={(e) => setVerifyNotes(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-800 text-[11px] font-medium leading-relaxed">
                ✓ Student will be able to create live auction listings, place bids, and receive verified badges on campus listings.
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedForVerify(null)}
                disabled={isVerifying}
                className="py-2.5 px-4 rounded-xl border border-slate-200 font-bold text-xs text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleVerifyStudent}
                disabled={isVerifying}
                className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5"
              >
                {isVerifying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Approve Verification
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== REJECT VERIFICATION MODAL ===================== */}
      {selectedForReject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl p-6 sm:p-7 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
              <UserX className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-xl font-black text-slate-900">Reject Verification Request</h3>
              <p className="text-xs text-slate-500">
                Reject verification for <strong className="text-slate-800">{selectedForReject.fullName}</strong>.
              </p>
            </div>

            <div className="space-y-3 pt-2 text-xs">
              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Mandatory Rejection Reason *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Invalid college ID provided, institutional email mismatch, or expired credentials."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedForReject(null)}
                disabled={isRejecting}
                className="py-2.5 px-4 rounded-xl border border-slate-200 font-bold text-xs text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRejectVerification}
                disabled={isRejecting || !rejectReason.trim()}
                className="py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isRejecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== SUSPEND STUDENT MODAL ===================== */}
      {selectedForSuspend && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl p-6 sm:p-7 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Ban className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-xl font-black text-slate-900">Suspend Student Account</h3>
              <p className="text-xs text-slate-500">
                Restrict marketplace access for <strong className="text-slate-800">{selectedForSuspend.fullName}</strong>.
              </p>
            </div>

            <div className="space-y-3 pt-2 text-xs">
              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Suspension Reason *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Failure to complete handover, abusive behavior, or suspicious auction bidding."
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Suspension Duration
                </label>
                <select
                  value={suspendDuration}
                  onChange={(e) => setSuspendDuration(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500 font-semibold"
                >
                  <option value="3">3 Days (Warning Period)</option>
                  <option value="7">7 Days (Standard Suspension)</option>
                  <option value="14">14 Days</option>
                  <option value="30">30 Days (Severe Policy Violation)</option>
                  <option value="0">Indefinite / Until Manual Review</option>
                </select>
              </div>

              <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-800 text-[11px] font-medium leading-relaxed">
                ⚠️ While suspended, the student will be immediately blocked from creating new listings, placing bids, or configuring auto-proxy limits. Existing historical bids remain preserved.
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedForSuspend(null)}
                disabled={isSuspending}
                className="py-2.5 px-4 rounded-xl border border-slate-200 font-bold text-xs text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSuspendStudent}
                disabled={isSuspending || !suspendReason.trim()}
                className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-200 transition flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isSuspending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
                Confirm Suspension
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== DELETE STUDENT MODAL ===================== */}
      {selectedForDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl p-6 sm:p-7 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-xl font-black text-slate-900">Delete Student Account</h3>
              <p className="text-xs text-slate-500">
                Are you sure you want to permanently delete <strong className="text-slate-800">{selectedForDelete.fullName}</strong> ({selectedForDelete.studentId})?
              </p>
            </div>

            <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-800 text-[11px] font-medium leading-relaxed">
              ⚠️ Permanent action: This student's account, active listings, placed bids, bookmarks, and notifications will be removed in accordance with university data retention policy.
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedForDelete(null)}
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
                {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                Confirm Permanent Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

