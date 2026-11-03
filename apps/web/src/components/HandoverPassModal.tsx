'use client';

import React, { useState, useEffect } from 'react';
import { QrCode, CheckCircle2, AlertCircle, Clock, MapPin, X, ShieldCheck } from 'lucide-react';

interface HandoverPassModalProps {
  listingId: string;
  isOpen: boolean;
  onClose: () => void;
  onHandoverComplete?: () => void;
}

export function HandoverPassModal({
  listingId,
  isOpen,
  onClose,
  onHandoverComplete,
}: HandoverPassModalProps) {
  const [passData, setPassData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Manual PIN input for verifier
  const [verifyPin, setVerifyPin] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    if (!isOpen || !listingId) return;
    loadPass();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, listingId, onClose]);

  const loadPass = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const token = localStorage.getItem('campus_token');
      const res = await fetch(`http://localhost:4000/api/v1/auctions/${listingId}/handover/pass`, {
        headers: {
          Authorization: `Bearer ${token || ''}`,
        },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPassData(data.data);
      } else {
        setErrorMsg(data.message || 'Failed to load handover pass');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyPin || verifyPin.trim().length !== 6) {
      setErrorMsg('Please enter a valid 6-digit backup PIN.');
      return;
    }

    setIsVerifying(true);
    setErrorMsg('');
    try {
      const token = localStorage.getItem('campus_token');
      const res = await fetch(`http://localhost:4000/api/v1/auctions/${listingId}/handover/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token || ''}`,
        },
        body: JSON.stringify({ code: verifyPin.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg(data.message || 'Handover successfully verified!');
        loadPass();
        if (onHandoverComplete) onHandoverComplete();
      } else {
        setErrorMsg(data.message || 'Failed to verify handover PIN');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error');
    } finally {
      setIsVerifying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-[#11102B]/75 backdrop-blur-sm animate-fade-in"
    >
      <div className="bg-white rounded-3xl max-w-md w-full max-h-[92vh] flex flex-col border border-[#302078]/20 shadow-2xl overflow-hidden animate-in zoom-in-95">
        <div className="px-6 py-4 border-b border-[#E5EAF2] flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-[#F1EEFF] text-[#633BFF] rounded-xl flex items-center justify-center">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-black text-[#15152D]">Campus Handover Pass</h3>
              <p className="text-[11px] text-[#718096]">Anti-Fraud Physical Verification</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-4 space-y-4 flex-1 min-h-0 text-xs">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-[#F1EEFF] border border-[#633BFF]/30 rounded-xl text-[#15152D] text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-[#633BFF]" />
              <span className="font-semibold">{successMsg}</span>
            </div>
          )}

          {loading ? (
            <div className="py-10 text-center text-[#718096] animate-pulse">
              Generating secure QR pass...
            </div>
          ) : passData ? (
            <div className="space-y-4">
              {/* Status Header */}
              <div className="flex items-center justify-between p-3 bg-[#F7F8FF] rounded-2xl border border-[#E5EAF2]">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#718096] block">Handover State</span>
                  <span className="font-black text-sm text-[#15152D]">{passData.status}</span>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
                  passData.status === 'COMPLETED'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-[#F1EEFF] text-[#633BFF] border border-[#633BFF]/20'
                }`}>
                  {passData.status === 'COMPLETED' ? '✓ Verified & Completed' : 'Pending Scan'}
                </span>
              </div>

              {/* QR Code Display */}
              {passData.qrCodeBase64 && passData.status !== 'COMPLETED' && (
                <div className="text-center p-5 bg-[#F1EEFF]/60 rounded-3xl border border-[#633BFF]/20 space-y-2">
                  <div className="p-3 bg-white rounded-2xl shadow-sm inline-block border border-slate-200">
                    <img
                      src={passData.qrCodeBase64}
                      alt="Handover Pass QR"
                      className="w-48 h-48 mx-auto"
                    />
                  </div>
                  <p className="text-[11px] text-[#718096]">
                    Show this QR code to the other party during physical campus meeting.
                  </p>
                </div>
              )}

              {/* 6-Digit Backup PIN */}
              {passData.backupPin && passData.status !== 'COMPLETED' && (
                <div className="p-4 bg-white rounded-2xl border border-[#E5EAF2] text-center space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#718096]">
                    6-Digit Backup PIN
                  </span>
                  <div className="text-2xl font-black tracking-widest text-[#633BFF] font-mono">
                    {passData.backupPin}
                  </div>
                  <span className="text-[10px] text-[#718096] block">
                    Use this PIN if QR scanning camera is unavailable
                  </span>
                </div>
              )}

              {/* Manual Verification Form */}
              {passData.status !== 'COMPLETED' && (
                <form onSubmit={handleVerifyPin} className="p-4 bg-[#F7F8FF] rounded-2xl border border-[#E5EAF2] space-y-2.5">
                  <span className="font-bold text-[#15152D] block">Verify Item Handover</span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="Enter 6-digit PIN"
                      value={verifyPin}
                      onChange={(e) => setVerifyPin(e.target.value.replace(/\D/g, ''))}
                      className="w-full px-3 py-2 text-center text-sm font-black tracking-widest font-mono bg-white rounded-xl border border-[#E5EAF2] focus:outline-none focus:border-[#633BFF]"
                    />
                    <button
                      type="submit"
                      disabled={isVerifying || verifyPin.length !== 6}
                      className="px-4 py-2 bg-gradient-to-r from-[#633BFF] to-[#536BFF] hover:brightness-110 disabled:opacity-50 text-white font-bold rounded-xl transition whitespace-nowrap"
                    >
                      {isVerifying ? 'Verifying...' : 'Validate'}
                    </button>
                  </div>
                </form>
              )}

              {/* Completed State */}
              {passData.status === 'COMPLETED' && (
                <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-200 text-center space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                  <h4 className="font-black text-sm text-emerald-950">Handover Verified & Recorded</h4>
                  <p className="text-xs text-emerald-800">
                    Both parties have confirmed inspection and accepted the physical transaction on campus.
                  </p>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
