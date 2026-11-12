'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { API_BASE } from '@/lib/api';
import {
  ArrowLeft,
  UserCheck,
  UserX,
  Ban,
  Clock,
  Shield,
  Trash2,
  Mail,
  GraduationCap,
  Building,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Package,
  Gavel,
  Trophy,
  AlertCircle,
  FileText,
  Loader2,
  ExternalLink,
  History
} from 'lucide-react';

interface StudentDetailProps {
  params: Promise<{ id: string }>;
}

export default function StudentDetailPage({ params }: StudentDetailProps) {
  const resolvedParams = use(params);
  const studentId = resolvedParams.id;
  const router = useRouter();

  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'listings' | 'bids' | 'won' | 'disputes' | 'audit'>('listings');

  // Modals state
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyNotes, setVerifyNotes] = useState('');
  
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  const [suspendDays, setSuspendDays] = useState<number>(7);

  const [showReactivateModal, setShowReactivateModal] = useState(false);
  const [reactivateNotes, setReactivateNotes] = useState('');

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);


  const fetchStudent = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('campus_admin_token') || localStorage.getItem('campus_token');
      const res = await fetch(`${API_BASE}/admin/students/${studentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStudent(data.data);
      } else {
        setError(data.message || 'Failed to load student details');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch student details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudent();
  }, [studentId]);

  // Close modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowVerifyModal(false);
        setShowRejectModal(false);
        setShowSuspendModal(false);
        setShowReactivateModal(false);
        setShowDeleteModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleVerify = async () => {
    try {
      setActionLoading(true);
      const token = localStorage.getItem('campus_admin_token') || localStorage.getItem('campus_token');
      const res = await fetch(`${API_BASE}/admin/students/${studentId}/verify`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ notes: verifyNotes })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setShowVerifyModal(false);
        setVerifyNotes('');
        await fetchStudent();
      } else {
        alert(data.message || 'Verification failed');
      }
    } catch (err: any) {
      alert(err.message || 'Network error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectVerification = async () => {
    if (!rejectReason.trim()) {
      alert('Please provide a mandatory rejection reason.');
      return;
    }
    try {
      setActionLoading(true);
      const token = localStorage.getItem('campus_admin_token') || localStorage.getItem('campus_token');
      const res = await fetch(`${API_BASE}/admin/students/${studentId}/reject-verification`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason: rejectReason })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setShowRejectModal(false);
        setRejectReason('');
        await fetchStudent();
      } else {
        alert(data.message || 'Action failed');
      }
    } catch (err: any) {
      alert(err.message || 'Network error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSuspend = async () => {
    if (!suspendReason.trim()) {
      alert('Please provide a mandatory suspension reason.');
      return;
    }
    try {
      setActionLoading(true);
      const token = localStorage.getItem('campus_admin_token') || localStorage.getItem('campus_token');
      const res = await fetch(`${API_BASE}/admin/students/${studentId}/suspend`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason: suspendReason, durationDays: suspendDays > 0 ? suspendDays : undefined })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setShowSuspendModal(false);
        setSuspendReason('');
        await fetchStudent();
      } else {
        alert(data.message || 'Suspension failed');
      }
    } catch (err: any) {
      alert(err.message || 'Network error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReactivate = async () => {
    try {
      setActionLoading(true);
      const token = localStorage.getItem('campus_admin_token') || localStorage.getItem('campus_token');
      const res = await fetch(`${API_BASE}/admin/students/${studentId}/reactivate`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ notes: reactivateNotes })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setShowReactivateModal(false);
        setReactivateNotes('');
        await fetchStudent();
      } else {
        alert(data.message || 'Reactivation failed');
      }
    } catch (err: any) {
      alert(err.message || 'Network error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setActionLoading(true);
      const token = localStorage.getItem('campus_admin_token') || localStorage.getItem('campus_token');
      const res = await fetch(`${API_BASE}/admin/students/${studentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert('Student account permanently deleted.');
        router.push('/admin/students');
      } else {
        alert(data.message || 'Deletion failed');
      }
    } catch (err: any) {
      alert(err.message || 'Network error');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
        <p className="text-slate-500 font-medium">Loading comprehensive student dossier...</p>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center">
        <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Student Dossier Unavailable</h2>
        <p className="text-slate-500 mb-6">{error || 'Unable to locate student records.'}</p>
        <Link
          href="/admin/students"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Return to Directory
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/students"
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
            title="Back to Students Directory"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <Link href="/admin/students" className="hover:text-indigo-600">Students</Link>
              <span>/</span>
              <span className="text-slate-700">{student.fullName}</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900">Student Profile & Verification</h1>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {!student.isVerified ? (
            <>
              <button
                onClick={() => setShowVerifyModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-sm transition"
              >
                <UserCheck className="w-4 h-4" /> Verify Campus Account
              </button>
              <button
                onClick={() => setShowRejectModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition"
              >
                <UserX className="w-4 h-4" /> Reject Verification
              </button>
            </>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Campus Verified
            </span>
          )}

          {student.isSuspended ? (
            <button
              onClick={() => setShowReactivateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-semibold shadow-sm transition"
            >
              <Shield className="w-4 h-4" /> Reactivate Student
            </button>
          ) : (
            <button
              onClick={() => setShowSuspendModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-sm font-semibold transition"
            >
              <Ban className="w-4 h-4" /> Suspend Student
            </button>
          )}

          <button
            onClick={() => setShowDeleteModal(true)}
            className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition"
            title="Delete Account"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Profile Overview Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-2xl bg-indigo-600 text-white font-black text-2xl flex items-center justify-center shadow-lg shadow-indigo-100">
              {student.fullName ? student.fullName.slice(0, 2).toUpperCase() : 'ST'}
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-2xl font-bold text-slate-900">{student.fullName}</h2>
                <span className="text-sm font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                  @{student.campusAlias}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                  student.isSuspended
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}>
                  {student.isSuspended ? 'SUSPENDED' : 'ACTIVE'}
                </span>
              </div>
              <p className="text-sm text-slate-500 flex items-center gap-2">
                <Mail className="w-4 h-4 text-slate-400" /> {student.email}
                <span className="text-slate-300">•</span>
                <span className="font-mono text-xs text-slate-600 font-semibold">ID: {student.studentId}</span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full md:w-auto">
            <div className="bg-slate-50 p-3 rounded-xl text-center border border-slate-100">
              <span className="text-xs font-semibold text-slate-500">Listings</span>
              <p className="text-xl font-bold text-slate-900">{student._count?.listings || 0}</p>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl text-center border border-slate-100">
              <span className="text-xs font-semibold text-slate-500">Bids Placed</span>
              <p className="text-xl font-bold text-slate-900">{student._count?.bids || 0}</p>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl text-center border border-slate-100">
              <span className="text-xs font-semibold text-slate-500">Auctions Won</span>
              <p className="text-xl font-bold text-emerald-600">{student._count?.outcomesWon || 0}</p>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl text-center border border-slate-100">
              <span className="text-xs font-semibold text-slate-500">Disputes</span>
              <p className="text-xl font-bold text-amber-600">{student.disputesAgainst?.length || 0}</p>
            </div>
          </div>
        </div>

        {/* Detailed Metadata Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Campus Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-slate-700">
                <GraduationCap className="w-4 h-4 text-indigo-500 shrink-0" />
                <span>Department: <strong>{student.department || 'Computer Science & Engineering'}</strong></span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <Building className="w-4 h-4 text-indigo-500 shrink-0" />
                <span>College: <strong>{student.college || 'Campus Institute of Technology'}</strong></span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                <span>Enrolled Since: {new Date(student.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Account Status & Safety</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-slate-500">Campus Verification: </span>
                {student.isVerified ? (
                  <span className="text-emerald-700 font-semibold">Verified</span>
                ) : (
                  <span className="text-amber-600 font-semibold">Pending Verification</span>
                )}
              </div>
              {student.verificationNotes && (
                <div className="text-xs bg-slate-50 p-2 rounded-lg border border-slate-100 text-slate-600">
                  <span className="font-semibold text-slate-700">Verification Notes: </span>
                  {student.verificationNotes}
                </div>
              )}
              {student.isSuspended && (
                <div className="text-xs bg-rose-50 p-2.5 rounded-lg border border-rose-200 text-rose-800 space-y-1">
                  <p><strong>Suspension Reason:</strong> {student.suspensionReason}</p>
                  {student.suspendedUntil && (
                    <p><strong>Expires:</strong> {new Date(student.suspendedUntil).toLocaleDateString('en-IN')}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Platform Security</h3>
            <div className="space-y-2 text-sm text-slate-600">
              <div className="flex items-center justify-between">
                <span>Account Role:</span>
                <span className="font-semibold text-slate-900">{student.role}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Last Activity:</span>
                <span className="text-slate-700 font-medium">
                  {student.lastLogin ? new Date(student.lastLogin).toLocaleString('en-IN') : 'Recently active'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Internal UUID:</span>
                <span className="font-mono text-xs text-slate-400 truncate max-w-[150px]">{student.id}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center border-b border-slate-200 px-6 gap-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('listings')}
            className={`py-4 text-sm font-bold border-b-2 flex items-center gap-2 transition whitespace-nowrap ${
              activeTab === 'listings'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Package className="w-4 h-4" /> Listings ({student.listings?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('bids')}
            className={`py-4 text-sm font-bold border-b-2 flex items-center gap-2 transition whitespace-nowrap ${
              activeTab === 'bids'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Gavel className="w-4 h-4" /> Bids Placed ({student.bids?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('won')}
            className={`py-4 text-sm font-bold border-b-2 flex items-center gap-2 transition whitespace-nowrap ${
              activeTab === 'won'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Trophy className="w-4 h-4" /> Won Items ({student.outcomesWon?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('disputes')}
            className={`py-4 text-sm font-bold border-b-2 flex items-center gap-2 transition whitespace-nowrap ${
              activeTab === 'disputes'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <AlertTriangle className="w-4 h-4" /> Disputes & Reports ({student.disputesAgainst?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`py-4 text-sm font-bold border-b-2 flex items-center gap-2 transition whitespace-nowrap ${
              activeTab === 'audit'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="w-4 h-4" /> Audit Log ({student.auditLogs?.length || 0})
          </button>
        </div>

        <div className="p-6">
          {/* Tab 1: Listings */}
          {activeTab === 'listings' && (
            <div>
              {student.listings && student.listings.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                        <th className="py-3 px-4">Item</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4">Starting Price</th>
                        <th className="py-3 px-4">Current / Final</th>
                        <th className="py-3 px-4">Bids</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Created Date</th>
                        <th className="py-3 px-4 text-right">View</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {student.listings.map((item: any) => (
                        <tr key={item.id} className="hover:bg-slate-50/60 transition">
                          <td className="py-3 px-4 font-semibold text-slate-900">
                            <div className="flex items-center gap-3">
                              {item.images?.[0]?.storagePath ? (
                                <img
                                  src={item.images[0].storagePath}
                                  alt=""
                                  className="w-10 h-10 rounded-lg object-cover bg-slate-100"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400">
                                  <Package className="w-5 h-5" />
                                </div>
                              )}
                              <span>{item.title}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-600">{item.category?.name || 'Uncategorized'}</td>
                          <td className="py-3 px-4 font-mono font-medium text-slate-700">₹{(item.startingPriceInCents / 100).toLocaleString('en-IN')}</td>
                          <td className="py-3 px-4 font-mono font-bold text-slate-900">
                            ₹{((item.currentLeadingBidInCents || item.startingPriceInCents) / 100).toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-4 text-slate-600">{item._count?.bids || 0}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${
                              item.status === 'ACTIVE'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : item.status === 'COMPLETED'
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}>
                              {item.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-500">
                            {new Date(item.createdAt).toLocaleDateString('en-IN')}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Link
                              href={`/auctions/${item.id}`}
                              target="_blank"
                              className="text-indigo-600 hover:text-indigo-800 font-semibold text-xs inline-flex items-center gap-1"
                            >
                              Live Page <ExternalLink className="w-3 h-3" />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-12 text-center text-slate-400">
                  <Package className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                  <p>No listings created by this student yet.</p>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Bids */}
          {activeTab === 'bids' && (
            <div>
              {student.bids && student.bids.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                        <th className="py-3 px-4">Bid ID</th>
                        <th className="py-3 px-4">Auction Item</th>
                        <th className="py-3 px-4">Bid Amount</th>
                        <th className="py-3 px-4">Listing Status</th>
                        <th className="py-3 px-4">Accepted Timestamp</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {student.bids.map((b: any) => (
                        <tr key={b.id} className="hover:bg-slate-50/60 transition">
                          <td className="py-3 px-4 font-mono text-xs text-slate-400">{b.id.slice(0, 8)}...</td>
                          <td className="py-3 px-4 font-semibold text-slate-900">{b.listing?.title || 'Unknown Listing'}</td>
                          <td className="py-3 px-4 font-mono font-bold text-indigo-600">
                            ₹{(b.amountInCents / 100).toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                              {b.listing?.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-500">
                            {new Date(b.acceptedAt).toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Link
                              href={`/auctions/${b.listingId}`}
                              target="_blank"
                              className="text-indigo-600 hover:text-indigo-800 text-xs font-semibold inline-flex items-center gap-1"
                            >
                              Auction <ExternalLink className="w-3 h-3" />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-12 text-center text-slate-400">
                  <Gavel className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                  <p>No bids placed by this student yet.</p>
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Won Items */}
          {activeTab === 'won' && (
            <div>
              {student.outcomesWon && student.outcomesWon.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {student.outcomesWon.map((outcome: any) => (
                    <div key={outcome.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                            Won Auction
                          </span>
                          <span className="font-mono font-bold text-slate-900">
                            ₹{(outcome.finalPriceInCents / 100).toLocaleString('en-IN')}
                          </span>
                        </div>
                        <h4 className="font-bold text-slate-900 text-base mb-1">{outcome.listing?.title}</h4>
                        <p className="text-xs text-slate-500 mb-2">
                          Campus Pickup: {outcome.listing?.pickupLocation || 'Main Campus'}
                        </p>
                        <p className="text-xs text-slate-500">
                          Seller: {outcome.listing?.seller?.campusAlias} ({outcome.listing?.seller?.email})
                        </p>
                      </div>
                      <div className="mt-4 pt-3 border-t border-slate-200 flex justify-end">
                        <Link
                          href={`/auctions/${outcome.listingId}`}
                          target="_blank"
                          className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1"
                        >
                          View Listing Record <ExternalLink className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-slate-400">
                  <Trophy className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                  <p>No winning auction outcomes on record.</p>
                </div>
              )}
            </div>
          )}

          {/* Tab 4: Disputes */}
          {activeTab === 'disputes' && (
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3">
                  Disputes / Complaints Filed Against This Student ({student.disputesAgainst?.length || 0})
                </h4>
                {student.disputesAgainst && student.disputesAgainst.length > 0 ? (
                  <div className="space-y-3">
                    {student.disputesAgainst.map((d: any) => (
                      <div key={d.id} className="p-4 rounded-xl border border-rose-200 bg-rose-50/30">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md">
                            {d.status}
                          </span>
                          <span className="text-xs text-slate-400">{new Date(d.createdAt).toLocaleDateString('en-IN')}</span>
                        </div>
                        <p className="text-sm font-semibold text-slate-900">{d.reason}</p>
                        <p className="text-xs text-slate-600 mt-1">{d.description}</p>
                        <p className="text-xs text-slate-400 mt-2">
                          Reported by: @{d.reporter?.campusAlias} ({d.reporter?.studentId})
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 italic">No complaints or safety reports filed against this student.</p>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100">
                <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3">
                  Reports Submitted by This Student ({student.disputesReported?.length || 0})
                </h4>
                {student.disputesReported && student.disputesReported.length > 0 ? (
                  <div className="space-y-3">
                    {student.disputesReported.map((d: any) => (
                      <div key={d.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-slate-700 bg-slate-200 px-2 py-0.5 rounded-md">
                            {d.status}
                          </span>
                          <span className="text-xs text-slate-400">{new Date(d.createdAt).toLocaleDateString('en-IN')}</span>
                        </div>
                        <p className="text-sm font-semibold text-slate-900">{d.reason}</p>
                        <p className="text-xs text-slate-600 mt-1">{d.description}</p>
                        {d.listing && (
                          <p className="text-xs text-slate-500 mt-2">Relates to: {d.listing.title}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 italic">This student has not submitted any reports.</p>
                )}
              </div>
            </div>
          )}

          {/* Tab 5: Audit Log */}
          {activeTab === 'audit' && (
            <div>
              {student.auditLogs && student.auditLogs.length > 0 ? (
                <div className="space-y-3">
                  {student.auditLogs.map((log: any) => (
                    <div key={log.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                            {log.action}
                          </span>
                          <span className="text-xs text-slate-500">
                            by {log.actor?.campusAlias || 'Administrator'}
                          </span>
                        </div>
                        {log.details && (
                          <pre className="text-xs text-slate-600 font-mono mt-1 whitespace-pre-wrap bg-white p-2 rounded border border-slate-100">
                            {typeof log.details === 'string' ? log.details : JSON.stringify(log.details, null, 2)}
                          </pre>
                        )}
                      </div>
                      <span className="text-xs text-slate-400 whitespace-nowrap ml-4">
                        {new Date(log.createdAt).toLocaleString('en-IN')}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-slate-400">
                  <History className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                  <p>No recorded administrative actions for this student account.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Verify Confirmation Modal */}
      {showVerifyModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-4">
              <UserCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Verify Campus Student</h3>
            <p className="text-sm text-slate-500 mb-4">
              Confirm campus verification for <strong>{student.fullName}</strong> ({student.studentId}). This enables full marketplace buying and selling privileges.
            </p>
            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Verification Notes (Optional)</label>
              <textarea
                value={verifyNotes}
                onChange={(e) => setVerifyNotes(e.target.value)}
                placeholder="e.g., Campus ID card verified physically / email domain validated"
                rows={3}
                className="w-full text-sm p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowVerifyModal(false)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={handleVerify}
                disabled={actionLoading}
                className="px-5 py-2 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm transition flex items-center gap-2"
              >
                {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Confirm Verification
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Verification Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200">
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mb-4">
              <UserX className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Reject Campus Verification</h3>
            <p className="text-sm text-slate-500 mb-4">
              Require student to resubmit legitimate campus credentials. A rejection reason is mandatory.
            </p>
            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Mandatory Rejection Reason *</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g., Student ID card image blurred or expired; ID number mismatch."
                rows={3}
                className="w-full text-sm p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectVerification}
                disabled={actionLoading}
                className="px-5 py-2 text-sm font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-sm transition flex items-center gap-2"
              >
                {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suspend Student Modal */}
      {showSuspendModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center mb-4">
              <Ban className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Suspend Student Account</h3>
            <p className="text-sm text-slate-500 mb-4">
              Suspended accounts cannot place bids, create listings, or make offers.
            </p>
            <div className="space-y-4 mb-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Suspension Reason *</label>
                <textarea
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  placeholder="e.g., Policy violation: failure to complete pickup / abusive communication"
                  rows={3}
                  className="w-full text-sm p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Suspension Duration (Days)</label>
                <select
                  value={suspendDays}
                  onChange={(e) => setSuspendDays(Number(e.target.value))}
                  className="w-full text-sm p-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  <option value={3}>3 Days</option>
                  <option value={7}>7 Days (1 Week)</option>
                  <option value={14}>14 Days (2 Weeks)</option>
                  <option value={30}>30 Days (1 Month)</option>
                  <option value={0}>Indefinite / Permanent</option>
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowSuspendModal(false)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSuspend}
                disabled={actionLoading}
                className="px-5 py-2 text-sm font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-sm transition flex items-center gap-2"
              >
                {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Confirm Suspension
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reactivate Modal */}
      {showReactivateModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200">
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mb-4">
              <Shield className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Reactivate Student Account</h3>
            <p className="text-sm text-slate-500 mb-4">
              Restore full marketplace access and lift all account restrictions for <strong>{student.fullName}</strong>.
            </p>
            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Reactivation Notes (Optional)</label>
              <textarea
                value={reactivateNotes}
                onChange={(e) => setReactivateNotes(e.target.value)}
                placeholder="e.g., Dispute resolved amicably; warning acknowledged."
                rows={3}
                className="w-full text-sm p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowReactivateModal(false)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={handleReactivate}
                disabled={actionLoading}
                className="px-5 py-2 text-sm font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-sm transition flex items-center gap-2"
              >
                {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Confirm Reactivation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permanent Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Permanently Delete Student</h3>
            <p className="text-sm text-rose-600 font-semibold mb-2">
              Warning: This action is irreversible.
            </p>
            <p className="text-sm text-slate-500 mb-4">
              All personal records, listings, and associated data for <strong>{student.fullName}</strong> will be permanently wiped from the database.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={actionLoading}
                className="px-5 py-2 text-sm font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-sm transition flex items-center gap-2"
              >
                {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

