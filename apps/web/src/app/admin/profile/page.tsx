'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Shield,
  User,
  Mail,
  Calendar,
  Clock,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
  Lock,
  Building,
  GraduationCap,
  History,
  Activity,
  ArrowLeft
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function AdminProfilePage() {
  const { adminUser: authUser, setAdminUserDirectly } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Edit form state
  const [fullName, setFullName] = useState('');
  const [campusAlias, setCampusAlias] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('campus_admin_token') || localStorage.getItem('campus_token');
      const res = await fetch(`${API_BASE}/admin/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setProfile(data.data);
        setFullName(data.data.fullName || '');
        setCampusAlias(data.data.campusAlias || '');
      }
    } catch (err) {
      console.error('Failed to load admin profile', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);
    setErrorMsg(null);

    if (newPassword && newPassword !== confirmPassword) {
      setErrorMsg('New password and confirmation do not match.');
      return;
    }

    try {
      setSaving(true);
      const token = localStorage.getItem('campus_admin_token') || localStorage.getItem('campus_token');
      const payload: any = {
        fullName: fullName.trim(),
        campusAlias: campusAlias.trim()
      };

      if (newPassword) {
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
      }

      const res = await fetch(`${API_BASE}/admin/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg(data.message || 'Profile updated successfully');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        if (data.user) {
          setProfile((prev: any) => ({ ...prev, ...data.user }));
          if (authUser) {
            setAdminUserDirectly({ ...authUser, ...data.user }, token);
          }
        }
      } else {
        setErrorMsg(data.message || 'Failed to update profile');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 text-purple-600 animate-spin mb-3" />
        <p className="text-xs font-semibold text-slate-500">Loading administrator dossier...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="p-2 text-slate-500 hover:text-slate-800 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-sm transition"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-slate-900">Administrator Profile</h1>
            <p className="text-xs text-slate-500">
              Manage your credentials, privileged campus access, and view administrative audit metrics.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-xl text-xs font-bold shadow-sm">
            <Shield className="w-4 h-4 text-purple-600" />
            Super Administrator
          </span>
        </div>
      </div>

      {/* Profile Overview Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white font-black text-2xl flex items-center justify-center shadow-md shadow-purple-900/20">
              {profile?.campusAlias?.slice(0, 2).toUpperCase() || 'AD'}
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-xl font-bold text-slate-900">{profile?.fullName || 'Campus Administrator'}</h2>
                <span className="text-xs font-mono text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-md font-semibold">
                  @{profile?.campusAlias || 'AdminOfficial'}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  ACTIVE
                </span>
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-slate-400" /> {profile?.email}
                <span className="text-slate-300">•</span>
                <span className="font-mono text-[11px] text-slate-500">ID: {profile?.studentId || 'ADMIN-01'}</span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center min-w-[120px]">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Audit Actions</span>
              <p className="text-xl font-bold text-purple-600 mt-0.5">{profile?.totalActions || 0}</p>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center min-w-[120px]">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Role</span>
              <p className="text-sm font-bold text-slate-800 mt-1">ADMINISTRATOR</p>
            </div>
          </div>
        </div>

        {/* Metadata Details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-5 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4 text-purple-600 shrink-0" />
            <span>Institution: <strong>{profile?.college || 'Campus Institute of Technology'}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-purple-600 shrink-0" />
            <span>Department: <strong>{profile?.department || 'Operations & Moderation'}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
            <span>Account Active Since: <strong>{new Date(profile?.createdAt || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</strong></span>
          </div>
        </div>
      </div>

      {/* Edit Form & Password Change */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <User className="w-5 h-5 text-purple-600" />
            <h3 className="font-bold text-slate-900 text-base">Account Settings</h3>
          </div>

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-600 uppercase mb-1">Official Full Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full text-sm p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-600 uppercase mb-1">Campus Alias / Display Tag</label>
              <input
                type="text"
                required
                value={campusAlias}
                onChange={(e) => setCampusAlias(e.target.value)}
                className="w-full text-sm p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-xs"
              />
            </div>

            <div className="pt-3 border-t border-slate-100">
              <div className="flex items-center gap-2 mb-3">
                <KeyRound className="w-4 h-4 text-purple-600" />
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Change Password (Optional)</h4>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block font-semibold text-slate-500 mb-1">Current Password</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password to authorize change"
                    className="w-full text-sm p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-500 mb-1">New Password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 8 characters"
                      className="w-full text-sm p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-500 mb-1">Confirm New Password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      className="w-full text-sm p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-xs shadow-md shadow-purple-900/20 transition flex items-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Profile Changes
              </button>
            </div>
          </form>
        </div>

        {/* Security Permissions & Access Summary */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Shield className="w-5 h-5 text-purple-600" />
            <h3 className="font-bold text-slate-900 text-base">Administrative Access</h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-100">
              <div className="flex items-center justify-between font-bold text-slate-900 mb-1">
                <span>Student Moderation</span>
                <span className="text-[10px] text-purple-700 bg-purple-100 px-2 py-0.5 rounded-md font-bold">FULL ACCESS</span>
              </div>
              <p className="text-slate-500 text-[11px]">Campus verification, account suspension, rejection, and deletion authority.</p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center justify-between font-bold text-slate-900 mb-1">
                <span>Marketplace Moderation</span>
                <span className="text-[10px] text-purple-700 bg-purple-100 px-2 py-0.5 rounded-md font-bold">FULL ACCESS</span>
              </div>
              <p className="text-slate-500 text-[11px]">Listing approvals, dispute arbitrations, category taxonomy management.</p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center justify-between font-bold text-slate-900 mb-1">
                <span>Anti-Sniping Engine</span>
                <span className="text-[10px] text-purple-700 bg-purple-100 px-2 py-0.5 rounded-md font-bold">CONFIGURABLE</span>
              </div>
              <p className="text-slate-500 text-[11px]">System rules, extension trigger timing, minimum increments, and institutional policies.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Administrative Activity Log */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-purple-600" />
            <h3 className="font-bold text-slate-900 text-base">Your Recent Administrative Actions</h3>
          </div>
          <Link
            href="/admin/audit-logs"
            className="text-xs font-semibold text-purple-600 hover:text-purple-800"
          >
            View Full Audit Trail →
          </Link>
        </div>

        {profile?.recentActions && profile.recentActions.length > 0 ? (
          <div className="divide-y divide-slate-100 text-xs">
            {profile.recentActions.map((log: any) => (
              <div key={log.id} className="py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-[11px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-100">
                    {log.action}
                  </span>
                  <span className="text-slate-600">{log.targetType}</span>
                  {log.targetId && (
                    <span className="font-mono text-slate-400 text-[10px] truncate max-w-[120px]">({log.targetId})</span>
                  )}
                </div>
                <span className="text-slate-400 text-[11px]">
                  {new Date(log.createdAt).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic py-4 text-center">No recent administrative actions recorded.</p>
        )}
      </div>
    </div>
  );
}

