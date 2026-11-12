'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { formatINR } from '@/lib/utils';
import { 
  User as UserIcon, 
  ShoppingBag, 
  Bell, 
  ShieldCheck, 
  ArrowRight,
  TrendingUp,
  Package,
  Pencil,
  Mail,
  Phone,
  GraduationCap,
  Building2,
  FileText,
  Trash2,
  Plus
} from 'lucide-react';
import { StudentProfileModal } from '@/components/StudentProfileModal';
import { TrustScoreBadge } from '@/components/TrustScoreBadge';
import { API_BASE } from '@/lib/api';

export default function DashboardPage() {
  const { user, setUserDirectly } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Personal Profile State
  const [profile, setProfile] = useState<any>(null);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);

  const fetchProfile = async () => {
    const token = localStorage.getItem('campus_token');
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/student/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const resData = await res.json();
      if (res.ok && resData.success) {
        setProfile(resData.data);
      }
    } catch (err) {
      console.error('Failed to fetch profile', err);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('campus_token');
    if (!token) {
      setLoading(false);
      return;
    }

    fetchProfile();

    fetch(`${API_BASE}/student/dashboard`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(resData => {
        if (resData.success) {
          setData(resData.data);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleProfileUpdated = (updatedUser: any) => {
    setProfile(updatedUser);
    const token = localStorage.getItem('campus_token');
    setUserDirectly(updatedUser, token);
  };

  const handleDeleteField = async (fieldName: string) => {
    if (!confirm(`Are you sure you want to remove this ${fieldName}?`)) return;
    const token = localStorage.getItem('campus_token');
    try {
      const res = await fetch(`${API_BASE}/student/profile/field/${fieldName}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token || ''}` }
      });
      const resData = await res.json();
      if (res.ok && resData.success) {
        handleProfileUpdated(resData.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-4">
          <UserIcon className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-slate-900">Student Profile & Dashboard</h2>
        <p className="text-sm text-slate-500 mt-2 mb-6">Please log in to manage your active auctions, bids, and won items.</p>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-md transition"
        >
          Sign In with Campus ID <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header Profile Badge */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
        <div className="flex items-center gap-4">
          {profile?.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt={profile.fullName || user.fullName}
              className="w-16 h-16 rounded-2xl object-cover border border-slate-200 shadow-md shadow-indigo-100"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-xl font-black shadow-md shadow-indigo-100">
              {(profile?.campusAlias || user.campusAlias).substring(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900">{profile?.fullName || user.fullName}</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                @{profile?.campusAlias || user.campusAlias}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-500 mt-1">
              <span>Student ID: <strong className="text-slate-700">{profile?.studentId || user.studentId}</strong></span>
              <span>•</span>
              <span className="text-emerald-600 font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Verified Campus Identity
              </span>
              <span>•</span>
              <TrustScoreBadge
                userId={user.id}
                sellerAlias={profile?.campusAlias || user.campusAlias}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Personal Details Information Card (View, Add, Edit, Delete) */}
      <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-sm mb-8 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <UserIcon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                Personal & Campus Credentials
              </h2>
              <p className="text-[11px] text-slate-500">
                View, add, edit, or delete your campus contact & department information
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsEditProfileOpen(true)}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
          >
            <Pencil className="w-3 h-3" />
            Modify Details
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {/* Email */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
            <div className="flex items-center gap-1.5 text-slate-400 font-bold uppercase text-[10px]">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              <span>Campus Email</span>
            </div>
            <p className="font-semibold text-slate-800 truncate" title={profile?.email || user.email}>
              {profile?.email || user.email}
            </p>
            <span className="text-[10px] text-emerald-600 font-semibold block">Institutional Primary</span>
          </div>

          {/* Department */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-slate-400 font-bold uppercase text-[10px]">
                <GraduationCap className="w-3.5 h-3.5 text-indigo-500" />
                <span>Department</span>
              </div>
              {profile?.department && (
                <button
                  type="button"
                  onClick={() => handleDeleteField('department')}
                  className="text-slate-400 hover:text-rose-500 transition"
                  title="Remove department"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
            {profile?.department ? (
              <p className="font-semibold text-slate-800">{profile.department}</p>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditProfileOpen(true)}
                className="text-indigo-600 hover:underline font-semibold flex items-center gap-1 text-[11px]"
              >
                <Plus className="w-3 h-3" /> Add Department
              </button>
            )}
          </div>

          {/* College */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-slate-400 font-bold uppercase text-[10px]">
                <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                <span>College / Campus</span>
              </div>
              {profile?.college && (
                <button
                  type="button"
                  onClick={() => handleDeleteField('college')}
                  className="text-slate-400 hover:text-rose-500 transition"
                  title="Remove college"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
            {profile?.college ? (
              <p className="font-semibold text-slate-800">{profile.college}</p>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditProfileOpen(true)}
                className="text-indigo-600 hover:underline font-semibold flex items-center gap-1 text-[11px]"
              >
                <Plus className="w-3 h-3" /> Add College
              </button>
            )}
          </div>

          {/* Phone */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-slate-400 font-bold uppercase text-[10px]">
                <Phone className="w-3.5 h-3.5 text-emerald-500" />
                <span>Handover Phone</span>
              </div>
              {profile?.phone && (
                <button
                  type="button"
                  onClick={() => handleDeleteField('phone')}
                  className="text-slate-400 hover:text-rose-500 transition"
                  title="Remove phone"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
            {profile?.phone ? (
              <p className="font-semibold text-slate-800">{profile.phone}</p>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditProfileOpen(true)}
                className="text-indigo-600 hover:underline font-semibold flex items-center gap-1 text-[11px]"
              >
                <Plus className="w-3 h-3" /> Add Phone / WhatsApp
              </button>
            )}
          </div>
        </div>

        {/* Bio Section */}
        <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <FileText className="w-3 h-3" />
              Student Statement / Bio
            </span>
            {profile?.bio && (
              <button
                type="button"
                onClick={() => handleDeleteField('bio')}
                className="text-slate-400 hover:text-rose-500 transition text-[11px] flex items-center gap-0.5"
                title="Clear bio"
              >
                <Trash2 className="w-3 h-3" /> Clear Bio
              </button>
            )}
          </div>
          {profile?.bio ? (
            <p className="text-slate-700 leading-relaxed italic">"{profile.bio}"</p>
          ) : (
            <p className="text-slate-400 italic">
              No bio added yet.{' '}
              <button
                type="button"
                onClick={() => setIsEditProfileOpen(true)}
                className="text-indigo-600 hover:underline not-italic font-bold"
              >
                + Add a short bio
              </button>{' '}
              to let other students know your campus dorm or exchange preferences.
            </p>
          )}
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
        <Link
          href="/dashboard/listings"
          className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-300 transition group block"
        >
          <div className="flex items-center justify-between text-slate-400 group-hover:text-indigo-600 transition">
            <span className="text-xs font-bold uppercase tracking-wider">My Active Listings</span>
            <Package className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="mt-3 text-3xl font-black text-slate-900">
            {data?.activeListings?.length ?? 0}
          </div>
          <span className="text-xs text-indigo-600 font-bold mt-1 flex items-center gap-1">
            Manage Listings →
          </span>
        </Link>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Active Bids</span>
            <TrendingUp className="w-5 h-5 text-blue-600" />
          </div>
          <div className="mt-3 text-3xl font-black text-slate-900">
            {data?.activeBidsCount ?? 0}
          </div>
          <span className="text-xs text-slate-400 mt-1 block">Auctions participating in</span>
        </div>

        <Link
          href="/dashboard/won"
          className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-emerald-300 transition group block"
        >
          <div className="flex items-center justify-between text-slate-400 group-hover:text-emerald-600 transition">
            <span className="text-xs font-bold uppercase tracking-wider">Items Won</span>
            <ShoppingBag className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="mt-3 text-3xl font-black text-slate-900">
            {data?.wonAuctions?.length ?? 0}
          </div>
          <span className="text-xs text-emerald-600 font-bold mt-1 flex items-center gap-1">
            View Won & Handovers →
          </span>
        </Link>

        <Link
          href="/notifications"
          className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-amber-300 transition group block"
        >
          <div className="flex items-center justify-between text-slate-400 group-hover:text-amber-600 transition">
            <span className="text-xs font-bold uppercase tracking-wider">Unread Alerts</span>
            <Bell className="w-5 h-5 text-amber-600" />
          </div>
          <div className="mt-3 text-3xl font-black text-slate-900">
            {data?.unreadNotificationsCount ?? 0}
          </div>
          <span className="text-xs text-amber-600 font-bold mt-1 flex items-center gap-1">
            View Notifications →
          </span>
        </Link>
      </div>

      {/* Two Columns: My Active Listings & Won Items */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Seller Listings (6 cols) */}
        <div className="lg:col-span-6 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg text-slate-900">Items I Am Selling</h3>
            <Link href="/dashboard/listings/new" className="text-xs font-bold text-indigo-600 hover:underline">
              + Add Item
            </Link>
          </div>

          <div className="space-y-3">
            {!data?.activeListings || data.activeListings.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">You haven't listed any items for auction yet.</p>
            ) : (
              data.activeListings.map((l: any) => (
                <Link
                  key={l.id}
                  href={`/auctions/${l.id}`}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 hover:bg-indigo-50/50 border border-slate-100 transition"
                >
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 line-clamp-1">{l.title}</h4>
                    <span className="text-xs text-slate-500 mt-0.5 block">
                      {l._count?.bids || 0} bids placed • Closes {new Date(l.closingTime).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-sm text-slate-900 block">
                      {formatINR(l.currentLeadingBidInCents || l.startingPriceInCents)}
                    </span>
                    <span className="text-[10px] uppercase font-bold text-indigo-600">View →</span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Right: Won / Provisional Wins (6 cols) */}
        <div className="lg:col-span-6 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg text-slate-900">Items Won & Handover Status</h3>
          </div>
          <div className="space-y-3">
            {!data?.wonAuctions || data.wonAuctions.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No won auctions yet. Check closing soon listings to bid!</p>
            ) : (
              data.wonAuctions.map((w: any) => (
                <div
                  key={w.id}
                  className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100 flex items-center justify-between"
                >
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">{w.listing?.title}</h4>
                    <span className="text-xs text-slate-500 mt-0.5 block">
                      Seller: @{w.listing?.seller?.campusAlias} • Decision: <strong>{w.sellerDecision}</strong>
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-sm text-emerald-800 block">
                      {formatINR(w.finalAmountInCents)}
                    </span>
                    <Link
                      href={`/dashboard/won`}
                      className="text-xs font-bold text-indigo-600 hover:underline"
                    >
                      Handover pass →
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Edit Profile Details Modal */}
      <StudentProfileModal
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
        profile={profile || user}
        onProfileUpdated={handleProfileUpdated}
      />
    </div>
  );
}
