'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { formatINR } from '@/lib/utils';
import { 
  Users, 
  Gavel, 
  ShoppingBag, 
  CheckCircle, 
  AlertTriangle, 
  ShieldCheck, 
  Ban, 
  RefreshCw 
} from 'lucide-react';

export default function AdminPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  const toggleUserSuspension = async (userId: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`http://localhost:4000/api/v1/admin/users/${userId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ isSuspended: !currentStatus })
      });
      const data = await res.json();
      if (data.success) {
        loadAdminData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-purple-100 text-purple-800 text-xs font-bold uppercase tracking-wider mb-2">
            <ShieldCheck className="w-4 h-4 text-purple-600" />
            University Administration
          </div>
          <h1 className="text-3xl font-black text-slate-900">Marketplace Control Center</h1>
          <p className="text-sm text-slate-500">Monitor auction volume, moderate listings, and manage student accounts</p>
        </div>
        <button
          onClick={loadAdminData}
          className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Data
        </button>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Verified Students</span>
            <Users className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="mt-3 text-3xl font-black text-slate-900">{stats?.totalUsers ?? '...'}</div>
          <span className="text-xs text-slate-400 mt-1 block">Active on campus</span>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Active Auctions</span>
            <Gavel className="w-5 h-5 text-blue-600" />
          </div>
          <div className="mt-3 text-3xl font-black text-slate-900">{stats?.activeAuctions ?? '...'}</div>
          <span className="text-xs text-slate-400 mt-1 block">Live bidding sessions</span>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Volume</span>
            <CheckCircle className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="mt-3 text-3xl font-black text-slate-900">{stats ? formatINR(stats.totalVolumeInCents) : '...'}</div>
          <span className="text-xs text-slate-400 mt-1 block">Completed handovers</span>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Accepted Bids</span>
            <ShoppingBag className="w-5 h-5 text-amber-600" />
          </div>
          <div className="mt-3 text-3xl font-black text-slate-900">{stats?.totalBids ?? '...'}</div>
          <span className="text-xs text-slate-400 mt-1 block">Across all listings</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Student Verification & Account Management (7 cols) */}
        <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-lg text-slate-900 mb-4">Student Identity Management</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-400 uppercase font-bold tracking-wider border-y border-slate-100">
                <tr>
                  <th className="py-3 px-3">Student</th>
                  <th className="py-3 px-3">ID / Email</th>
                  <th className="py-3 px-3">Role</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-3 font-bold text-slate-900">{u.fullName} <span className="text-slate-400 font-normal">({u.campusAlias})</span></td>
                    <td className="py-3 px-3 text-slate-600 font-mono text-[11px]">{u.studentId}<br/>{u.email}</td>
                    <td className="py-3 px-3 font-semibold text-slate-700">{u.role}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${u.isSuspended ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {u.isSuspended ? 'Suspended' : 'Active'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      {u.role !== 'ADMIN' && (
                        <button
                          onClick={() => toggleUserSuspension(u.id, u.isSuspended)}
                          className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
                            u.isSuspended
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                          }`}
                        >
                          {u.isSuspended ? 'Reactivate' : 'Suspend'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Audit Log (5 cols) */}
        <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-lg text-slate-900 mb-4">Audit Logs</h3>
          <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
            {auditLogs.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No audit logs recorded yet.</p>
            ) : (
              auditLogs.map((log) => (
                <div key={log.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                  <div className="flex items-center justify-between font-bold text-slate-800">
                    <span>{log.action}</span>
                    <span className="text-[10px] text-slate-400">{new Date(log.createdAt).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-slate-600 mt-1">Target: {log.targetType} ({log.targetId?.substring(0, 8)}...)</p>
                  {log.actor && (
                    <span className="text-[10px] text-purple-700 font-semibold block mt-0.5">By {log.actor.campusAlias}</span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
