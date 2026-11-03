'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { UserPlus, AlertCircle, ArrowRight, ShieldCheck, Eye, EyeOff, Loader2 } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();

  const [formData, setFormData] = useState({
    fullName: '',
    campusAlias: '',
    studentId: '',
    email: '',
    password: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    const res = await register(formData);
    if (res.success) {
      router.push('/auctions');
    } else {
      setErrorMsg(res.message || 'Registration failed. Please check your details.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12 bg-[#F7F9FC]">
      <div className="max-w-md w-full bg-white rounded-3xl border border-[#E5EAF2] shadow-xl p-8 space-y-6">
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#5145FF] to-[#3563FF] text-white flex items-center justify-center mx-auto mb-4 shadow-md shadow-indigo-100">
            <UserPlus className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-black text-[#11182D]">Create Student Account</h2>
          <p className="text-xs text-[#718096] mt-1">Join verified campus auctions to buy and sell safely</p>
        </div>

        {errorMsg && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#718096] mb-1.5">Full Name</label>
            <input
              type="text"
              required
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              placeholder="e.g. Rahul Sharma"
              className="w-full px-4 py-2.5 text-xs sm:text-sm bg-[#F7F9FC] rounded-xl border border-[#E5EAF2] focus:outline-none focus:border-[#5145FF] focus:ring-2 focus:ring-indigo-100 text-[#151B2C] placeholder:text-[#718096] transition"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#718096] mb-1.5">Campus Alias</label>
              <input
                type="text"
                required
                value={formData.campusAlias}
                onChange={(e) => setFormData({ ...formData, campusAlias: e.target.value })}
                placeholder="e.g. RahulS"
                className="w-full px-4 py-2.5 text-xs sm:text-sm bg-[#F7F9FC] rounded-xl border border-[#E5EAF2] focus:outline-none focus:border-[#5145FF] focus:ring-2 focus:ring-indigo-100 text-[#151B2C] placeholder:text-[#718096] transition"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#718096] mb-1.5">Student ID</label>
              <input
                type="text"
                required
                value={formData.studentId}
                onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                placeholder="e.g. CS2025-019"
                className="w-full px-4 py-2.5 text-xs sm:text-sm bg-[#F7F9FC] rounded-xl border border-[#E5EAF2] focus:outline-none focus:border-[#5145FF] focus:ring-2 focus:ring-indigo-100 text-[#151B2C] placeholder:text-[#718096] transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#718096] mb-1.5">Campus Email</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="e.g. rahul.sharma@campus.edu"
              className="w-full px-4 py-2.5 text-xs sm:text-sm bg-[#F7F9FC] rounded-xl border border-[#E5EAF2] focus:outline-none focus:border-[#5145FF] focus:ring-2 focus:ring-indigo-100 text-[#151B2C] placeholder:text-[#718096] transition"
            />
            <span className="text-[10px] text-[#718096] mt-1 block">Requires a valid college or institutional email address</span>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#718096] mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Minimum 8 characters"
                className="w-full pl-4 pr-10 py-2.5 text-xs sm:text-sm bg-[#F7F9FC] rounded-xl border border-[#E5EAF2] focus:outline-none focus:border-[#5145FF] focus:ring-2 focus:ring-indigo-100 text-[#151B2C] placeholder:text-[#718096] transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="p-1 text-[#718096] hover:text-[#151B2C] absolute right-3 top-1/2 -translate-y-1/2 rounded-lg transition"
                title={showPassword ? 'Hide password' : 'View password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="p-3 bg-indigo-50/70 rounded-xl border border-indigo-100 flex items-center gap-2 text-indigo-900 text-xs">
            <ShieldCheck className="w-4 h-4 text-[#5145FF] shrink-0" />
            <span>Accounts are verified for student bidding & campus handovers.</span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#5145FF] hover:bg-[#4338CA] text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-indigo-100 transition flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Complete Registration <ArrowRight className="w-4 h-4" /></>}
          </button>
        </form>

        <div className="pt-4 border-t border-[#E5EAF2] text-center">
          <p className="text-xs text-[#718096]">
            Already have a student account?{' '}
            <Link href="/login" className="font-bold text-[#5145FF] hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
