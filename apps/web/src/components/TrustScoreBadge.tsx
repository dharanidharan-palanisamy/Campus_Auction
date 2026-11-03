'use client';

import React, { useState, useEffect } from 'react';
import { ShieldCheck, Star, Award, CheckCircle2, MessageCircle, X } from 'lucide-react';

interface TrustProfileProps {
  userId: string;
  sellerAlias: string;
}

export function TrustScoreBadge({ userId, sellerAlias }: TrustProfileProps) {
  const [profile, setProfile] = useState<any>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) return;
    fetch(`http://localhost:4000/api/v1/auctions/users/${userId}/trust`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setProfile(data.data);
        }
      })
      .catch((err) => console.error('Failed to load trust profile', err));
  }, [userId]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const score = profile?.reputation?.score ?? 85;
  const tier = profile?.reputation?.tier ?? 'TRUSTED';
  const successfulHandovers = profile?.reputation?.successfulHandoversCount ?? 0;
  const averageRating = profile?.reputation?.averageRating ?? 5.0;
  const ratingCount = profile?.reputation?.ratingCount ?? 0;

  const getTierColor = (t: string) => {
    switch (t) {
      case 'ELITE':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'TRUSTED':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'RISING':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border transition hover:opacity-90 shadow-sm cursor-pointer"
        style={{ textDecoration: 'none' }}
        title="Click to view full Campus Trust & Verification breakdown"
      >
        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
        <span className="font-extrabold text-slate-800">Trust {score}/100</span>
        <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-black uppercase tracking-wide border ${getTierColor(tier)}`}>
          {tier}
        </span>
      </button>

      {/* Trust Score Breakdown Modal */}
      {isOpen && (
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsOpen(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
        >
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[92vh] flex flex-col border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Campus Trust Reputation</h3>
                  <p className="text-xs text-slate-500">Reputation & Verified Transactions for {sellerAlias}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto px-6 py-5 space-y-5 flex-1 min-h-0 text-xs">
              {/* Overall Score Banner */}
              <div className="p-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 rounded-2xl border border-emerald-100 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-900">Calculated Trust Score</span>
                  <div className="text-3xl font-black text-emerald-700 flex items-baseline gap-1 mt-0.5">
                    {score} <span className="text-sm font-semibold text-emerald-600">/ 100</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider border ${getTierColor(tier)}`}>
                    {tier} SELLER
                  </span>
                  <span className="block text-[11px] text-slate-500 mt-1">Verified Student ID</span>
                </div>
              </div>

              {/* Score Pillars */}
              <div className="grid grid-cols-3 gap-2.5 text-center">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Buyer Rating</span>
                  <div className="flex items-center justify-center gap-1 mt-0.5 text-amber-500 font-black text-sm">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    <span>{averageRating}</span>
                  </div>
                  <span className="text-[10px] text-slate-400">({ratingCount} reviews)</span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">QR Handovers</span>
                  <span className="text-sm font-black text-indigo-700 mt-0.5 block">{successfulHandovers}</span>
                  <span className="text-[10px] text-slate-400">Completed</span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Response Rate</span>
                  <span className="text-sm font-black text-emerald-600 mt-0.5 block">98%</span>
                  <span className="text-[10px] text-slate-400">Under 15 mins</span>
                </div>
              </div>

              {/* Recent Buyer Feedback */}
              <div className="space-y-2 pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                  <MessageCircle className="w-3.5 h-3.5" />
                  Verified Student Buyer Feedback
                </h4>

                {profile?.recentReviews && profile.recentReviews.length > 0 ? (
                  <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                    {profile.recentReviews.map((r: any) => (
                      <div key={r.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-slate-800">{r.buyer?.campusAlias || 'Student'}</span>
                          <div className="flex text-amber-400">
                            {Array.from({ length: r.overallRating }).map((_, i) => (
                              <Star key={i} className="w-3 h-3 fill-amber-400" />
                            ))}
                          </div>
                        </div>
                        <p className="text-slate-600">{r.comment || 'Smooth campus handover, item matched condition exactly.'}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic py-2 text-center bg-slate-50 rounded-xl">
                    No written feedback yet. Completing QR-verified handovers unlocks verified badges.
                  </p>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 shrink-0">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition"
              >
                Close Reputation Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

