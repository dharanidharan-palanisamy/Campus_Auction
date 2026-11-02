'use client';

import React, { useEffect, useState } from 'react';
import {
  Sliders,
  Shield,
  Zap,
  Building,
  Mail,
  Clock,
  DollarSign,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Info
} from 'lucide-react';

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Settings state
  const [settings, setSettings] = useState({
    marketplace_name: 'CampusBid Verified Marketplace',
    campus_name: 'National Institute of Engineering & Technology',
    support_email: 'marketplace-support@campus.edu',
    anti_sniping_extension_seconds: 60,
    anti_sniping_trigger_seconds: 30,
    default_min_increment_cents: 5000,
    seller_decision_deadline_hours: 24,
    verification_policy: 'INSTITUTIONAL_EMAIL_AND_STUDENT_ID',
    auto_proxy_bidding_enabled: true
  });

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('campus_token');
      const res = await fetch(`${API_BASE}/admin/settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSettings((prev) => ({
          ...prev,
          ...data.data
        }));
      }
    } catch (err) {
      console.error('Failed to load settings', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setSuccessMsg(null);
      setErrorMsg(null);
      const token = localStorage.getItem('campus_token');

      const res = await fetch(`${API_BASE}/admin/settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ settings })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg('Marketplace configuration and auction rules saved successfully.');
        setTimeout(() => setSuccessMsg(null), 4000);
      } else {
        setErrorMsg(data.message || 'Failed to save settings');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">System & Marketplace Settings</h1>
          <p className="text-sm text-slate-500">
            Configure campus branding, anti-sniping auction timing rules, and verification requirements.
          </p>
        </div>

        <button
          onClick={fetchSettings}
          className="p-2 text-slate-500 hover:text-slate-800 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-sm transition self-start sm:self-auto"
          title="Reload Settings"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold flex items-center gap-2.5">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-semibold flex items-center gap-2.5">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {loading ? (
        <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center bg-white rounded-2xl border border-slate-200">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-2" />
          <p className="text-sm font-medium">Loading platform configurations...</p>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          {/* Section 1: Institution & Branding */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Building className="w-5 h-5 text-indigo-600" />
              <h2 className="text-base font-bold text-slate-900">Campus & Marketplace Identity</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Marketplace Name
                </label>
                <input
                  type="text"
                  value={settings.marketplace_name}
                  onChange={(e) => setSettings({ ...settings, marketplace_name: e.target.value })}
                  className="w-full text-sm p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Institution / University Name
                </label>
                <input
                  type="text"
                  value={settings.campus_name}
                  onChange={(e) => setSettings({ ...settings, campus_name: e.target.value })}
                  className="w-full text-sm p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Official Support & Dispute Email
                </label>
                <input
                  type="email"
                  value={settings.support_email}
                  onChange={(e) => setSettings({ ...settings, support_email: e.target.value })}
                  className="w-full text-sm p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Auction Engine & Anti-Sniping */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Zap className="w-5 h-5 text-amber-500" />
              <div>
                <h2 className="text-base font-bold text-slate-900">Anti-Sniping Engine & Bidding Parameters</h2>
                <p className="text-xs text-slate-500">
                  Prevents last-second bot/sniping bids by dynamically extending closing time.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Anti-Sniping Trigger Window (Seconds)
                </label>
                <input
                  type="number"
                  min={5}
                  max={300}
                  value={settings.anti_sniping_trigger_seconds}
                  onChange={(e) =>
                    setSettings({ ...settings, anti_sniping_trigger_seconds: Number(e.target.value) })
                  }
                  className="w-full text-sm p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-[11px] text-slate-400 mt-0.5 block">
                  Bids placed within this window trigger an automatic closing extension.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Extension Duration (Seconds)
                </label>
                <input
                  type="number"
                  min={10}
                  max={600}
                  value={settings.anti_sniping_extension_seconds}
                  onChange={(e) =>
                    setSettings({ ...settings, anti_sniping_extension_seconds: Number(e.target.value) })
                  }
                  className="w-full text-sm p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-[11px] text-slate-400 mt-0.5 block">
                  How many seconds to push the closing time back when triggered.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Default Minimum Bid Increment (₹ INR)
                </label>
                <input
                  type="number"
                  min={10}
                  value={settings.default_min_increment_cents / 100}
                  onChange={(e) =>
                    setSettings({ ...settings, default_min_increment_cents: Number(e.target.value) * 100 })
                  }
                  className="w-full text-sm p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Seller Decision Deadline (Hours)
                </label>
                <input
                  type="number"
                  min={1}
                  max={72}
                  value={settings.seller_decision_deadline_hours}
                  onChange={(e) =>
                    setSettings({ ...settings, seller_decision_deadline_hours: Number(e.target.value) })
                  }
                  className="w-full text-sm p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Verification & Security Policy */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Shield className="w-5 h-5 text-emerald-600" />
              <h2 className="text-base font-bold text-slate-900">Campus Verification & Trust Policies</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Student Verification Criteria
                </label>
                <select
                  value={settings.verification_policy}
                  onChange={(e) => setSettings({ ...settings, verification_policy: e.target.value })}
                  className="w-full text-sm p-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700"
                >
                  <option value="INSTITUTIONAL_EMAIL_AND_STUDENT_ID">
                    Strict: Official College Email + Verified Student ID (Recommended)
                  </option>
                  <option value="COLLEGE_EMAIL_ONLY">
                    Moderate: Valid @campus.edu Email Domain Only
                  </option>
                  <option value="MANUAL_ADMIN_APPROVAL_ONLY">
                    High Security: Manual Physical Administrator Review Only
                  </option>
                </select>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.auto_proxy_bidding_enabled}
                    onChange={(e) =>
                      setSettings({ ...settings, auto_proxy_bidding_enabled: e.target.checked })
                    }
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  />
                  <div>
                    <span className="text-sm font-semibold text-slate-800">
                      Enable Automatic Proxy Bidding Engine
                    </span>
                    <p className="text-xs text-slate-500">
                      Allows students to set confidential maximum limits; bids auto-increment incrementally on their behalf.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Submit Action */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-100 transition flex items-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save All Settings
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
