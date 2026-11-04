'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { io, Socket } from 'socket.io-client';
import confetti from 'canvas-confetti';
import { formatINR, getTimeRemaining } from '@/lib/utils';
import { 
  ArrowLeft,
  Clock, 
  MapPin, 
  ShieldCheck, 
  AlertCircle, 
  TrendingUp, 
  CheckCircle2, 
  User as UserIcon, 
  MessageSquare, 
  Send,
  Pencil,
  Trash2,
  X,
  AlertTriangle,
  Loader2,
  Package,
  QrCode,
  Heart,
  Share2,
  Maximize2,
  HelpCircle,
  Calendar,
  Sparkles,
  Trophy,
  Lock
} from 'lucide-react';

import { Suspense } from 'react';
import { ImageDropzone } from '@/components/ImageDropzone';
import { TrustScoreBadge } from '@/components/TrustScoreBadge';
import { HandoverPassModal } from '@/components/HandoverPassModal';
import { PickupAppointmentCard } from '@/components/PickupAppointmentCard';

export default function AuctionDetailPage() {
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto px-4 py-20 text-center text-[#718096]">Loading Midnight Luxe auction details...</div>}>
      <AuctionDetailContent />
    </Suspense>
  );
}

function AuctionDetailContent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [auction, setAuction] = useState<any>(null);
  const [bids, setBids] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Gallery state
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  // Bid form state
  const [customBidAmount, setCustomBidAmount] = useState('');
  const [isSubmittingBid, setIsSubmittingBid] = useState(false);
  const [confirmBidModalOpen, setConfirmBidModalOpen] = useState(false);
  const [pendingBidAmount, setPendingBidAmount] = useState<number | null>(null);

  // Q&A form
  const [newQuestion, setNewQuestion] = useState('');

  // Countdown state
  const [timeLeft, setTimeLeft] = useState({ totalMs: 0, days: 0, hours: 0, minutes: 0, seconds: 0, isUrgent: false, isExpired: false });

  // Seller Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [editTitle, setEditTitle] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editCondition, setEditCondition] = useState('GOOD');
  const [editDescription, setEditDescription] = useState('');
  const [editStartingPrice, setEditStartingPrice] = useState('');
  const [editMinIncrement, setEditMinIncrement] = useState('');
  const [editPickupLocation, setEditPickupLocation] = useState('');
  const [editSellerNotes, setEditSellerNotes] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [modalError, setModalError] = useState('');
  const [isHandoverPassOpen, setIsHandoverPassOpen] = useState(false);

  // Fetch initial details
  const fetchAuction = async () => {
    try {
      const res = await fetch(`http://localhost:4000/api/v1/auctions/${id}`);
      const data = await res.json();
      if (data.success) {
        setAuction(data.data);
        setBids(data.data.bids || []);
        setQuestions(data.data.questions || []);
        setTimeLeft(getTimeRemaining(data.data.closingTime));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuction();
  }, [id]);

  // Fetch categories for edit form
  useEffect(() => {
    fetch('http://localhost:4000/api/v1/auctions/categories')
      .then(res => res.json())
      .then(data => {
        if (data.success) setCategories(data.data);
      })
      .catch(console.error);
  }, []);

  // Live timer interval
  useEffect(() => {
    if (!auction?.closingTime) return;
    const interval = setInterval(() => {
      setTimeLeft(getTimeRemaining(auction.closingTime));
    }, 1000);
    return () => clearInterval(interval);
  }, [auction?.closingTime]);

  // Close all modals on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsEditModalOpen(false);
        setIsDeleteModalOpen(false);
        setIsHandoverPassOpen(false);
        setIsZoomOpen(false);
        setConfirmBidModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Socket.IO live updates
  useEffect(() => {
    const socket: Socket = io('http://localhost:4000');
    socket.emit('join_auction', id);

    socket.on('auction:bid-accepted', (payload: any) => {
      setBids((prev) => [payload.bid, ...prev]);
      setAuction((prev: any) => ({
        ...prev,
        currentLeadingBidInCents: payload.currentLeadingBidInCents,
        closingTime: payload.newClosingTime || prev.closingTime,
      }));

      if (payload.extended) {
        setSuccessMsg('⏱ Anti-sniping extension triggered! Timer extended by 60 seconds for fair bidding.');
      }
    });

    return () => {
      socket.emit('leave_auction', id);
      socket.disconnect();
    };
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F8FF] flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-3xl border border-[#302078]/20 shadow-xl text-center space-y-4 max-w-sm w-full">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#633BFF] to-[#536BFF] text-white flex items-center justify-center mx-auto shadow-md shadow-[#633BFF]/25 animate-spin">
            <Sparkles className="w-6 h-6" />
          </div>
          <p className="text-sm font-black text-[#15152D]">Loading Midnight Luxe Auction...</p>
          <p className="text-xs text-[#718096]">Connecting to real-time campus bidding engine</p>
        </div>
      </div>
    );
  }

  if (!auction) {
    return (
      <div className="min-h-[70vh] bg-[#F7F8FF] flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-3xl border border-[#302078]/20 shadow-xl text-center space-y-4 max-w-md w-full">
          <AlertCircle className="w-12 h-12 text-[#633BFF] mx-auto" />
          <h2 className="text-xl font-black text-[#15152D]">Auction Listing Not Found</h2>
          <p className="text-xs text-[#718096]">This campus auction may have been removed or concluded.</p>
          <Link
            href="/auctions"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#633BFF] hover:bg-[#536BFF] text-white text-xs font-bold rounded-xl shadow-md transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Return to Auctions
          </Link>
        </div>
      </div>
    );
  }

  const currentPrice = auction.currentLeadingBidInCents > 0
    ? auction.currentLeadingBidInCents
    : auction.startingPriceInCents;

  const minNextBid = auction.currentLeadingBidInCents > 0
    ? auction.currentLeadingBidInCents + auction.minIncrementInCents
    : auction.startingPriceInCents;

  const isAuctionEnded = timeLeft.isExpired || auction.status === 'COMPLETED' || auction.status === 'UNSOLD';
  const hasBids = bids.length > 0;
  const winningBid = hasBids ? bids[0] : null;
  const winnerAlias = auction.outcome?.winner?.campusAlias || winningBid?.bidder?.campusAlias || null;
  const winnerId = auction.outcome?.winnerId || winningBid?.bidderId || winningBid?.bidder?._id || winningBid?.bidder?.id;

  const isWinner = Boolean(
    user && (
      (winnerId && String(user.id) === String(winnerId)) ||
      (winnerAlias && user.campusAlias?.toLowerCase() === winnerAlias.toLowerCase())
    )
  );
  const isSeller = Boolean(user && (user.id === auction.sellerId || user.role === 'ADMIN'));
  const canCoordinateHandover = isWinner || isSeller || user?.role === 'ADMIN';

  // Image list
  const imagesList = auction.images && auction.images.length > 0
    ? auction.images.map((img: any) => img.url)
    : ['https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=1200&q=80'];

  const activeImageUrl = imagesList[activeImageIndex] || imagesList[0];

  // Share action
  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2500);
    }
  };

  // Open Edit Modal with current listing values
  const openEditModal = () => {
    setModalError('');
    setEditTitle(auction.title || '');
    setEditCategoryId(auction.categoryId || (categories[0]?.id ?? ''));
    setEditCondition(auction.condition || 'GOOD');
    setEditDescription(auction.description || '');
    setEditStartingPrice((auction.startingPriceInCents / 100).toString());
    setEditMinIncrement((auction.minIncrementInCents / 100).toString());
    setEditPickupLocation(auction.pickupLocation || '');
    setEditSellerNotes(auction.sellerNotes || '');
    setEditImageUrl(auction.images?.[0]?.url || '');
    setIsEditModalOpen(true);
  };

  // Submit Edit Listing
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');

    if (editTitle.trim().length < 3) {
      setModalError('Title must be at least 3 characters.');
      return;
    }
    if (editDescription.trim().length < 10) {
      setModalError('Description must be at least 10 characters.');
      return;
    }
    if (!editPickupLocation.trim()) {
      setModalError('Campus pickup location is required.');
      return;
    }

    setIsSavingEdit(true);

    try {
      const payload: any = {
        title: editTitle.trim(),
        categoryId: editCategoryId,
        condition: editCondition,
        description: editDescription.trim(),
        pickupLocation: editPickupLocation.trim(),
        sellerNotes: editSellerNotes.trim() || null,
        imageUrls: editImageUrl.trim() ? [editImageUrl.trim()] : undefined,
      };

      if (!hasBids) {
        const parsedStart = parseFloat(editStartingPrice);
        const parsedInc = parseFloat(editMinIncrement);
        if (isNaN(parsedStart) || parsedStart <= 0) {
          setModalError('Starting price must be greater than zero.');
          setIsSavingEdit(false);
          return;
        }
        if (isNaN(parsedInc) || parsedInc <= 0) {
          setModalError('Minimum increment must be positive.');
          setIsSavingEdit(false);
          return;
        }
        payload.startingPriceInCents = Math.round(parsedStart * 100);
        payload.minIncrementInCents = Math.round(parsedInc * 100);
      }

      const res = await fetch(`http://localhost:4000/api/v1/auctions/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('campus_token') || ''}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setModalError(data.message || 'Failed to update listing.');
      } else {
        setAuction(data.data);
        setSuccessMsg('Product details updated successfully in Midnight Luxe!');
        setIsEditModalOpen(false);
      }
    } catch (err: any) {
      setModalError(err.message || 'Network error while updating.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Submit Delete Listing
  const handleDelete = async () => {
    setIsDeleting(true);
    setErrorMsg('');

    try {
      const res = await fetch(`http://localhost:4000/api/v1/auctions/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('campus_token') || ''}`,
        },
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.message || 'Failed to delete listing.');
        setIsDeleteModalOpen(false);
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error while deleting.');
      setIsDeleteModalOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

  // Trigger Confirmation Modal for Bid
  const initiateBid = (amountInCents: number) => {
    if (!user) {
      setErrorMsg('Please log in with your campus account to place a bid.');
      return;
    }
    setPendingBidAmount(amountInCents);
    setConfirmBidModalOpen(true);
  };

  // Execute Bid Placement
  const confirmAndPlaceBid = async () => {
    if (!pendingBidAmount) return;
    setConfirmBidModalOpen(false);
    setErrorMsg('');
    setSuccessMsg('');
    setIsSubmittingBid(true);

    try {
      const res = await fetch(`http://localhost:4000/api/v1/auctions/${id}/bids`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('campus_token') || ''}`,
        },
        body: JSON.stringify({
          amountInCents: pendingBidAmount,
          idempotencyKey: crypto.randomUUID(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.message || 'Bid rejected by auction engine.');
      } else {
        setSuccessMsg(`Your bid of ${formatINR(pendingBidAmount)} is currently leading!`);
        confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } });
        setCustomBidAmount('');
        fetchAuction();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit bid.');
    } finally {
      setIsSubmittingBid(false);
      setPendingBidAmount(null);
    }
  };

  // Handle Q&A Question submission
  const handleAskQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setErrorMsg('Please log in to ask a question.');
      return;
    }
    if (!newQuestion.trim()) return;

    try {
      const res = await fetch(`http://localhost:4000/api/v1/auctions/${id}/questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('campus_token') || ''}`,
        },
        body: JSON.stringify({ content: newQuestion.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setQuestions([data.data, ...questions]);
        setNewQuestion('');
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F8FF] text-[#15152D] pb-20">
      {/* 1. Contextual Sub-Nav */}
      <div className="bg-white text-slate-800 border-b border-[#E5EAF2] py-3 px-4 sm:px-6 lg:px-8 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <button
            onClick={() => {
              if (typeof window !== 'undefined' && window.history.length > 1) {
                router.back();
              } else {
                router.push('/auctions');
              }
            }}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-[#633BFF] hover:bg-slate-50 px-3 py-1.5 rounded-xl transition group"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform text-[#633BFF]" />
            <span>Back to Auctions</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Auction Feed
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        {/* Toast Alerts */}
        {errorMsg && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-center justify-between shadow-xs animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg('')} className="text-rose-500 hover:text-rose-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-4 rounded-2xl bg-[#F1EEFF] border border-[#633BFF]/30 text-[#15152D] text-xs sm:text-sm flex items-center justify-between shadow-xs animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-[#633BFF]" />
              <span className="font-semibold">{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg('')} className="text-[#633BFF] hover:text-[#536BFF]">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {shareCopied && (
          <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-[#11102B] text-white border border-[#302078] shadow-2xl flex items-center gap-2.5 text-xs animate-in slide-in-from-bottom-5">
            <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
            <span>Auction share link copied to clipboard!</span>
          </div>
        )}

        {/* ===================== EDITORIAL TWO-COLUMN LAYOUT ===================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          
          {/* ===================== LEFT COLUMN (7 Cols) ===================== */}
          <div className="lg:col-span-7 space-y-8">
            
            {/* 2. Product Gallery with Balanced Normal Size */}
            <div className="bg-white rounded-3xl p-3 sm:p-4 border border-[#E5EAF2] shadow-xl shadow-indigo-50/50 space-y-3">
              <div className="relative w-full h-64 sm:h-72 md:h-[320px] rounded-2xl overflow-hidden bg-[#0D0C22] flex items-center justify-center group">
                <img
                  src={activeImageUrl}
                  alt={auction.title}
                  className="max-h-full max-w-full object-contain p-2 transition-transform duration-300 group-hover:scale-[1.02]"
                />

                {/* Status Badges Overlay */}
                <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1.5 z-10 pointer-events-none">
                  <span className="bg-[#11102B]/85 backdrop-blur-md text-white px-2.5 py-0.5 rounded-full text-[11px] font-bold border border-white/10 shadow-sm">
                    {auction.category?.name}
                  </span>
                  <span className="bg-[#633BFF] text-white px-2.5 py-0.5 rounded-full text-[11px] font-bold shadow-sm">
                    Condition: {auction.condition?.replace('_', ' ')}
                  </span>
                </div>

                {/* Right Top Action Overlay (Zoom, Favorite, Share) */}
                <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
                  <button
                    onClick={() => setIsZoomOpen(true)}
                    className="p-2 rounded-xl bg-[#11102B]/80 hover:bg-[#11102B] text-white backdrop-blur-md transition shadow-sm"
                    title="Zoom Image"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setIsFavorited(!isFavorited)}
                    className={`p-2 rounded-xl backdrop-blur-md transition shadow-sm ${
                      isFavorited
                        ? 'bg-rose-500 text-white'
                        : 'bg-[#11102B]/80 hover:bg-[#11102B] text-white'
                    }`}
                    title={isFavorited ? 'Saved to Favorites' : 'Save Item'}
                  >
                    <Heart className={`w-3.5 h-3.5 ${isFavorited ? 'fill-current' : ''}`} />
                  </button>
                  <button
                    onClick={handleShare}
                    className="p-2 rounded-xl bg-[#11102B]/80 hover:bg-[#11102B] text-white backdrop-blur-md transition shadow-sm"
                    title="Share Listing"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Seller Workspace Badge */}
                {isSeller && (
                  <div className="absolute bottom-3 left-3 bg-gradient-to-r from-[#633BFF] to-[#536BFF] text-white text-[11px] font-black px-3 py-1 rounded-full flex items-center gap-1.5 shadow-md">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    Seller Workspace (Your Listing)
                  </div>
                )}
              </div>

              {/* Thumbnails Row */}
              {imagesList.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 scrollbar-none">
                  {imagesList.map((url: string, index: number) => (
                    <button
                      key={index}
                      onClick={() => setActiveImageIndex(index)}
                      className={`relative w-14 h-14 rounded-xl overflow-hidden shrink-0 border-2 transition-all ${
                        activeImageIndex === index
                          ? 'border-[#633BFF] ring-2 ring-[#633BFF]/30 scale-105'
                          : 'border-slate-200 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={url} alt={`Thumbnail ${index + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 3. Product Information Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E5EAF2] shadow-xl shadow-indigo-50/50 space-y-4">
              <h1 className="text-2xl sm:text-4xl font-extrabold text-[#15152D] tracking-tight leading-snug">
                {auction.title}
              </h1>

              {/* Description */}
              <div className="space-y-2 pt-1">
                <h3 className="text-xs font-black uppercase tracking-wider text-[#718096]">Item Description</h3>
                <p className="text-sm sm:text-base text-[#15152D] leading-relaxed whitespace-pre-line">
                  {auction.description}
                </p>
              </div>
            </div>

            {/* 9. Campus Inspection & Handover (Hidden while auction is live; ONLY displayed when auction is completed/won) */}
            {isAuctionEnded && (hasBids || auction.status === 'COMPLETED') && (
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E5EAF2] shadow-xl shadow-indigo-50/50 space-y-5 animate-in fade-in">
                {/* Official Winner Announcement Banner (Visible to all students) */}
                <div className="p-5 rounded-2xl bg-gradient-to-br from-[#F1EEFF] via-white to-[#F1EEFF]/60 border-2 border-[#633BFF]/30 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#633BFF] to-[#536BFF] text-white flex items-center justify-center shadow-md shadow-[#633BFF]/25">
                        <Trophy className="w-5 h-5 text-amber-300" />
                      </div>
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-[#633BFF] block">
                          Official Auction Winner
                        </span>
                        <h4 className="text-lg font-black text-[#15152D]">
                          {winnerAlias ? `${winnerAlias}` : 'Winning Bidder'}
                        </h4>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-black">
                      ✓ Won & Approved
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-[#633BFF]/15 text-xs">
                    <span className="text-[#718096]">Final Winning Bid</span>
                    <span className="font-black text-[#15152D] text-base price-tag">
                      {formatINR(winningBid?.amountInCents || currentPrice)}
                    </span>
                  </div>

                  {isWinner && (
                    <div className="pt-2 text-xs font-bold text-[#633BFF] flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                      <span>Congratulations! You are the authorized winning buyer for this auction.</span>
                    </div>
                  )}
                  {isSeller && !isWinner && (
                    <div className="pt-2 text-xs font-bold text-[#633BFF] flex items-center gap-1.5">
                      <Package className="w-4 h-4" />
                      <span>You are the seller. Coordinate handover with winning buyer ({winnerAlias}).</span>
                    </div>
                  )}
                </div>

                {/* Private Appointment Controls (ONLY for Winner & Seller, not every people) */}
                {canCoordinateHandover ? (
                  <div className="space-y-4 pt-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-[#633BFF]" />
                        <h4 className="font-black text-sm text-[#15152D]">
                          {isWinner ? 'Coordinate Your Pickup Appointment (Winner)' : 'Coordinate Handover Slot (Seller)'}
                        </h4>
                      </div>
                      <span className="text-[10px] font-bold bg-[#633BFF] text-white px-2.5 py-0.5 rounded-full">
                        Private Handover
                      </span>
                    </div>
                    <p className="text-xs text-[#718096]">
                      Inspect items before payment. Safe meeting spots include campus library lobbies, student unions, and main campus gate security points.
                    </p>
                    <PickupAppointmentCard listingId={id as string} />
                  </div>
                ) : (
                  /* Restricted View for other students ("not every peoples") */
                  <div className="p-5 rounded-2xl bg-[#F7F8FF] border border-[#E5EAF2] text-center space-y-2">
                    <ShieldCheck className="w-6 h-6 text-[#633BFF] mx-auto" />
                    <h4 className="font-black text-xs text-[#15152D]">Campus Handover Restricted to Winner & Seller</h4>
                    <p className="text-[11px] text-[#718096] max-w-md mx-auto leading-relaxed">
                      Pickup scheduling and one-time QR passes are exclusively accessible to {winnerAlias || 'the winning student'} and the seller to protect campus safety and privacy.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* 10. Questions and Answers */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E5EAF2] shadow-xl shadow-indigo-50/50 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#F1EEFF] text-[#633BFF] flex items-center justify-center">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-[#15152D]">Questions & Answers ({questions.length})</h3>
                    <p className="text-xs text-[#718096]">Direct inquiries with the student seller</p>
                  </div>
                </div>
              </div>

              {/* Ask Input */}
              <form onSubmit={handleAskQuestion} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Ask about wear, included cables, receipts, or pickup availability..."
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  className="flex-1 bg-[#F7F8FF] border border-[#E5EAF2] rounded-xl px-4 py-2.5 text-xs sm:text-sm text-[#15152D] placeholder:text-[#718096] focus:outline-none focus:border-[#633BFF] focus:ring-2 focus:ring-[#633BFF]/10 transition"
                />
                <button
                  type="submit"
                  className="bg-gradient-to-r from-[#633BFF] to-[#536BFF] hover:brightness-110 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md shadow-[#633BFF]/20 transition flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Ask</span>
                </button>
              </form>

              {/* Question Threads */}
              <div className="space-y-4 divide-y divide-slate-100">
                {questions.length === 0 ? (
                  <div className="text-center py-6 bg-[#F7F8FF] rounded-2xl border border-[#E5EAF2] p-6">
                    <HelpCircle className="w-8 h-8 text-[#633BFF] mx-auto mb-2" />
                    <p className="font-bold text-xs text-[#15152D]">No Questions Asked Yet</p>
                    <p className="text-[11px] text-[#718096] mt-0.5">Be the first student to inquire about this listing.</p>
                  </div>
                ) : (
                  questions.map((q) => (
                    <div key={q.id} className="pt-4 first:pt-0 space-y-2">
                      <div className="flex items-baseline justify-between text-xs">
                        <span className="font-extrabold text-[#15152D]">{q.asker?.campusAlias}</span>
                        <span className="text-[#718096] text-[11px]">{new Date(q.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-xs sm:text-sm text-[#15152D]">{q.content}</p>

                      {/* Answers */}
                      {q.answers && q.answers.length > 0 && (
                        <div className="ml-3 sm:ml-4 pl-3 border-l-2 border-[#633BFF] space-y-1.5 mt-2">
                          {q.answers.map((ans: any) => (
                            <div key={ans.id} className="bg-[#F1EEFF] p-3 rounded-xl text-xs">
                              <span className="font-black text-[#633BFF]">{ans.seller?.campusAlias} (Seller): </span>
                              <span className="text-[#15152D]">{ans.content}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* ===================== RIGHT COLUMN: STICKY BIDDING PANEL (5 Cols) ===================== */}
          <div className="lg:col-span-5 space-y-6">
            <div className="sticky top-20 space-y-6">
              
              {/* 5. Auction Countdown (Midnight Luxe Gradient Panel) */}
              <div className="bg-gradient-to-br from-[#11102B] via-[#302078] to-[#11102B] text-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-[#302078]/80 relative overflow-hidden">
                {/* Subtle Ambient Glow */}
                <div className="absolute -right-8 -top-8 w-36 h-36 bg-[#633BFF]/25 rounded-full blur-3xl pointer-events-none" />

                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
                    <span className="text-xs font-black uppercase tracking-wider text-[#F1EEFF]">
                      {timeLeft.isExpired ? 'Auction Concluded' : timeLeft.isUrgent ? 'Anti-Sniping Active' : 'Closing Countdown'}
                    </span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-white text-[10px] font-bold border border-white/10">
                    Live Timer
                  </span>
                </div>

                {/* 4 Individual Countdown Blocks */}
                {timeLeft.isExpired ? (
                  <div className="py-6 text-center bg-white/5 rounded-2xl border border-white/10">
                    <span className="text-2xl font-black text-[#F1EEFF]">AUCTION CLOSED</span>
                    <p className="text-xs text-slate-300 mt-1">Bidding has concluded for this listing.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10 shadow-xs">
                      <span className="block font-black text-2xl sm:text-3xl num-display text-white">
                        {String(timeLeft.days).padStart(2, '0')}
                      </span>
                      <span className="block text-[9px] uppercase font-black tracking-widest text-[#F1EEFF]/70 mt-1">
                        Days
                      </span>
                    </div>

                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10 shadow-xs">
                      <span className="block font-black text-2xl sm:text-3xl num-display text-white">
                        {String(timeLeft.hours).padStart(2, '0')}
                      </span>
                      <span className="block text-[9px] uppercase font-black tracking-widest text-[#F1EEFF]/70 mt-1">
                        Hours
                      </span>
                    </div>

                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10 shadow-xs">
                      <span className="block font-black text-2xl sm:text-3xl num-display text-white">
                        {String(timeLeft.minutes).padStart(2, '0')}
                      </span>
                      <span className="block text-[9px] uppercase font-black tracking-widest text-[#F1EEFF]/70 mt-1">
                        Mins
                      </span>
                    </div>

                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10 shadow-xs ring-1 ring-[#633BFF]/50">
                      <span className="block font-black text-2xl sm:text-3xl num-display text-amber-300 animate-pulse">
                        {String(timeLeft.seconds).padStart(2, '0')}
                      </span>
                      <span className="block text-[9px] uppercase font-black tracking-widest text-[#F1EEFF]/70 mt-1">
                        Secs
                      </span>
                    </div>
                  </div>
                )}

                <div className="mt-4 pt-3 border-t border-white/10 flex items-center gap-2 text-[11px] text-[#F1EEFF]/80">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#10B981] shrink-0" />
                  <span>Fair play guarantee: Bids in last 30s auto-extend timer by 60s.</span>
                </div>
              </div>

              {/* 6. Bidding Console Panel */}
              <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#E5EAF2] shadow-xl shadow-indigo-50/50 space-y-6">
                {/* Price Display */}
                <div className="flex items-baseline justify-between pb-4 border-b border-[#E5EAF2]">
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-wider text-[#718096] block">
                      {isAuctionEnded ? (hasBids ? 'Final Winning Bid' : 'Starting Reserve Price') : (auction.currentLeadingBidInCents > 0 ? 'Current Leading Bid' : 'Starting Reserve Price')}
                    </span>
                    <div className="text-3xl sm:text-4xl font-black text-[#15152D] price-tag mt-0.5">
                      {formatINR(currentPrice)}
                    </div>
                    {isAuctionEnded && winnerAlias && (
                      <span className="text-xs font-bold text-[#633BFF] flex items-center gap-1 mt-1">
                        <Trophy className="w-3.5 h-3.5" /> Won by {winnerAlias}
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] font-semibold text-[#718096] block">Min Increment</span>
                    <span className="text-xs font-black text-[#633BFF] bg-[#F1EEFF] px-2.5 py-1 rounded-lg inline-block mt-0.5">
                      +{formatINR(auction.minIncrementInCents)}
                    </span>
                  </div>
                </div>

                {/* Bidding Controls / Seller Action */}
                {!timeLeft.isExpired && auction.status === 'ACTIVE' && (
                  <div className="space-y-4">
                    {isSeller ? (
                      /* Seller Management Card */
                      <div className="p-5 bg-gradient-to-br from-[#F1EEFF]/50 to-white rounded-2xl border border-[#633BFF]/20 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black uppercase tracking-wider text-[#15152D] flex items-center gap-1.5">
                            <Package className="w-4 h-4 text-[#633BFF]" />
                            Seller Controls
                          </span>
                          <span className="text-[10px] font-bold bg-[#633BFF] text-white px-2 py-0.5 rounded-full">
                            Your Auction
                          </span>
                        </div>
                        <p className="text-xs text-[#718096] leading-relaxed">
                          {!hasBids
                            ? 'No bids placed yet. You can edit starting prices, images, description, or cancel freely.'
                            : `${bids.length} active bid(s) received. Starting price is locked, but you can update details or coordinate handovers.`}
                        </p>
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <button
                            onClick={openEditModal}
                            className="py-2.5 px-3 rounded-xl bg-[#633BFF] hover:bg-[#536BFF] text-white font-bold text-xs shadow-sm transition flex items-center justify-center gap-1.5"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            Edit Details
                          </button>
                          <button
                            onClick={() => setIsDeleteModalOpen(true)}
                            className="py-2.5 px-3 rounded-xl bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 font-bold text-xs transition flex items-center justify-center gap-1.5"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Prominent Next Bid Button */}
                        <button
                          onClick={() => initiateBid(minNextBid)}
                          disabled={isSubmittingBid}
                          className="w-full py-4 px-4 rounded-2xl bg-gradient-to-r from-[#633BFF] via-[#536BFF] to-[#633BFF] hover:brightness-110 text-white font-black text-sm sm:text-base shadow-lg shadow-[#633BFF]/30 active:scale-[0.98] transition flex items-center justify-center gap-2"
                        >
                          <TrendingUp className="w-4 h-4" />
                          <span>Place Next Bid: {formatINR(minNextBid)}</span>
                        </button>

                        {/* Custom Bid Input with Quick Increment Chips */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#718096] font-bold text-sm">₹</span>
                              <input
                                type="number"
                                placeholder={`Custom (min ${minNextBid / 100})`}
                                value={customBidAmount}
                                onChange={(e) => setCustomBidAmount(e.target.value)}
                                className="w-full pl-8 pr-3 py-2.5 text-xs sm:text-sm bg-[#F7F8FF] rounded-xl border border-[#E5EAF2] text-[#15152D] focus:outline-none focus:border-[#633BFF] focus:ring-2 focus:ring-[#633BFF]/10 font-bold"
                              />
                            </div>
                            <button
                              onClick={() => {
                                const val = parseFloat(customBidAmount);
                                if (!isNaN(val)) initiateBid(Math.round(val * 100));
                              }}
                              disabled={isSubmittingBid || !customBidAmount}
                              className="px-5 py-2.5 rounded-xl bg-[#11102B] hover:bg-[#302078] disabled:opacity-50 text-white font-bold text-xs transition"
                            >
                              Bid
                            </button>
                          </div>

                          {/* Quick Increment suggestions */}
                          <div className="flex items-center gap-1.5 text-[11px]">
                            <span className="text-[#718096]">Quick add:</span>
                            {[100, 250, 500].map((inc) => (
                              <button
                                key={inc}
                                type="button"
                                onClick={() => setCustomBidAmount(((minNextBid / 100) + inc).toString())}
                                className="px-2 py-0.5 rounded-md bg-[#F1EEFF] text-[#633BFF] hover:bg-[#633BFF] hover:text-white font-bold transition"
                              >
                                +₹{inc}
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* 7. QR Handover Card (Lavender Luxe) */}
                <div className="p-5 bg-[#F1EEFF] rounded-2xl border border-[#633BFF]/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-[#15152D] flex items-center gap-1.5">
                      <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-[#633BFF] to-[#536BFF] text-white flex items-center justify-center">
                        <QrCode className="w-3.5 h-3.5" />
                      </div>
                      QR Verified Handover
                    </span>
                    <span className="text-[10px] font-black bg-[#633BFF] text-white px-2 py-0.5 rounded-full">
                      One-Time Pass
                    </span>
                  </div>
                  <p className="text-xs text-[#718096] leading-relaxed">
                    {!isAuctionEnded
                      ? "One-time encrypted QR pass and 6-digit PIN will be issued to the winning buyer and seller once bidding closes."
                      : canCoordinateHandover
                      ? "Generate or scan the secure, anti-fraud one-time QR pass and 6-digit backup PIN to finalize physical campus handover."
                      : `QR Handover pass is private and restricted to the winning buyer (${winnerAlias || 'Winner'}) and seller.`}
                  </p>
                  {isAuctionEnded && canCoordinateHandover && (
                    <button
                      type="button"
                      onClick={() => setIsHandoverPassOpen(true)}
                      className="w-full py-2.5 px-3 rounded-xl bg-[#633BFF] hover:bg-[#536BFF] text-white font-bold text-xs shadow-sm transition flex items-center justify-center gap-1.5"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      Open Handover Pass & PIN
                    </button>
                  )}
                </div>

                {/* 8. Bid History Timeline */}
                <div className="space-y-3 pt-4 border-t border-[#E5EAF2]">
                  <div className="flex items-center justify-between text-xs font-black text-[#718096] uppercase tracking-wider">
                    <span>Public Bid History</span>
                    <span>{bids.length} Accepted Bids</span>
                  </div>

                  <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 pr-1">
                    {bids.length === 0 ? (
                      <p className="text-xs text-[#718096] py-4 text-center">No bids placed yet. Be the first student bidder!</p>
                    ) : (
                      bids.map((b, i) => (
                        <div key={b.id || i} className="py-2.5 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-2 h-2 rounded-full ${i === 0 ? 'bg-[#633BFF] ring-4 ring-[#633BFF]/20 animate-pulse' : 'bg-slate-300'}`} />
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-[#15152D]">{b.bidder?.campusAlias || 'Student Bidder'}</span>
                                {i === 0 && (
                                  <span className="text-[9px] bg-gradient-to-r from-[#633BFF] to-[#536BFF] text-white font-black px-1.5 py-0.2 rounded-full">
                                    Current Leader
                                  </span>
                                )}
                              </div>
                              <span className="block text-[10px] text-[#718096]">
                                {new Date(b.acceptedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                          <span className="font-black text-[#15152D] price-tag text-sm">
                            {formatINR(b.amountInCents)}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===================== BID CONFIRMATION MODAL ===================== */}
      {confirmBidModalOpen && pendingBidAmount && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setConfirmBidModalOpen(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#11102B]/70 backdrop-blur-sm animate-fade-in"
        >
          <div className="bg-white rounded-3xl max-w-md w-full border border-[#302078]/20 shadow-2xl p-6 sm:p-7 space-y-5 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#633BFF] to-[#536BFF] text-white flex items-center justify-center mx-auto shadow-md shadow-[#633BFF]/30">
              <TrendingUp className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-xl font-black text-[#15152D]">Confirm Your Campus Bid</h3>
              <p className="text-xs text-[#718096]">
                You are placing a leading bid on <strong className="text-[#15152D]">"{auction.title}"</strong>
              </p>
            </div>

            <div className="p-4 bg-[#F1EEFF] rounded-2xl border border-[#633BFF]/20 text-center space-y-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#633BFF]">Authorized Bid Amount</span>
              <div className="text-3xl font-black text-[#15152D] price-tag">
                {formatINR(pendingBidAmount)}
              </div>
            </div>

            <div className="space-y-2 text-xs text-[#718096]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#10B981] shrink-0" />
                <span>Binding offer: Approved bids require on-campus pickup.</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#633BFF] shrink-0" />
                <span>Anti-sniping protection: Clock extends by 60s if bid in last 30s.</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmBidModalOpen(false)}
                className="py-2.5 px-4 rounded-xl border border-slate-200 font-bold text-xs text-[#15152D] hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmAndPlaceBid}
                disabled={isSubmittingBid}
                className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#633BFF] to-[#536BFF] hover:brightness-110 text-white font-black text-xs shadow-md shadow-[#633BFF]/25 transition flex items-center justify-center gap-2"
              >
                {isSubmittingBid ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm & Submit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== IMAGE LIGHTBOX / ZOOM MODAL ===================== */}
      {isZoomOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsZoomOpen(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#11102B]/90 backdrop-blur-md animate-fade-in"
        >
          <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center">
            <button
              onClick={() => setIsZoomOpen(false)}
              className="absolute -top-12 right-0 p-2 text-white hover:text-[#633BFF] transition"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={activeImageUrl}
              alt={auction.title}
              className="max-h-[80vh] w-auto rounded-2xl object-contain shadow-2xl border border-white/10"
            />
            <p className="text-xs text-white/80 mt-3">{auction.title} — High Resolution Inspection</p>
          </div>
        </div>
      )}

      {/* ===================== EDIT PRODUCT MODAL ===================== */}
      {isEditModalOpen && (
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsEditModalOpen(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[#11102B]/70 backdrop-blur-sm animate-fade-in"
        >
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col border border-[#302078]/20 shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="px-6 py-4 sm:px-8 sm:py-5 border-b border-[#E5EAF2] flex items-center justify-between shrink-0 bg-white">
              <div>
                <h3 className="text-lg sm:text-xl font-black text-[#15152D] flex items-center gap-2">
                  <Pencil className="w-5 h-5 text-[#633BFF]" />
                  Edit Product Details
                </h3>
                <p className="text-xs text-[#718096] mt-0.5">
                  Update your campus listing information
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto px-6 py-5 sm:px-8 sm:py-6 space-y-4 text-xs flex-1 min-h-0">
              {modalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{modalError}</span>
                </div>
              )}

              <form id="edit-listing-form" onSubmit={handleSaveEdit} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold uppercase tracking-wider text-[#718096] mb-1">
                    Item Title
                  </label>
                  <input
                    type="text"
                    required
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm bg-[#F7F8FF] rounded-xl border border-[#E5EAF2] focus:outline-none focus:border-[#633BFF]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold uppercase tracking-wider text-[#718096] mb-1">
                      Category
                    </label>
                    <select
                      value={editCategoryId}
                      onChange={(e) => setEditCategoryId(e.target.value)}
                      className="w-full px-4 py-2.5 bg-[#F7F8FF] rounded-xl border border-[#E5EAF2] font-semibold text-[#15152D] focus:outline-none focus:border-[#633BFF]"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold uppercase tracking-wider text-[#718096] mb-1">
                      Condition
                    </label>
                    <select
                      value={editCondition}
                      onChange={(e) => setEditCondition(e.target.value)}
                      className="w-full px-4 py-2.5 bg-[#F7F8FF] rounded-xl border border-[#E5EAF2] font-semibold text-[#15152D] focus:outline-none focus:border-[#633BFF]"
                    >
                      <option value="NEW">New</option>
                      <option value="LIKE_NEW">Like New</option>
                      <option value="GOOD">Good</option>
                      <option value="FAIR">Fair</option>
                      <option value="POOR">Poor</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold uppercase tracking-wider text-[#718096] mb-1">
                    Description
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm bg-[#F7F8FF] rounded-xl border border-[#E5EAF2] focus:outline-none focus:border-[#633BFF]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold uppercase tracking-wider text-[#718096] mb-1">
                      Starting Price (₹) {hasBids && <span className="text-amber-600 font-semibold">(Locked - Bids exist)</span>}
                    </label>
                    <input
                      type="number"
                      min="1"
                      disabled={hasBids}
                      value={editStartingPrice}
                      onChange={(e) => setEditStartingPrice(e.target.value)}
                      className="w-full px-4 py-2.5 text-sm bg-[#F7F8FF] disabled:bg-slate-100 disabled:text-slate-400 rounded-xl border border-[#E5EAF2] focus:outline-none focus:border-[#633BFF]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold uppercase tracking-wider text-[#718096] mb-1">
                      Min Increment (₹) {hasBids && <span className="text-amber-600 font-semibold">(Locked)</span>}
                    </label>
                    <input
                      type="number"
                      min="1"
                      disabled={hasBids}
                      value={editMinIncrement}
                      onChange={(e) => setEditMinIncrement(e.target.value)}
                      className="w-full px-4 py-2.5 text-sm bg-[#F7F8FF] disabled:bg-slate-100 disabled:text-slate-400 rounded-xl border border-[#E5EAF2] focus:outline-none focus:border-[#633BFF]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold uppercase tracking-wider text-[#718096] mb-1">
                    Campus Handover Location
                  </label>
                  <input
                    type="text"
                    required
                    value={editPickupLocation}
                    onChange={(e) => setEditPickupLocation(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm bg-[#F7F8FF] rounded-xl border border-[#E5EAF2] focus:outline-none focus:border-[#633BFF]"
                  />
                </div>

                <ImageDropzone
                  value={editImageUrl}
                  onChange={setEditImageUrl}
                  label="Product Photo"
                  required={false}
                />
              </form>
            </div>

            <div className="px-6 py-4 sm:px-8 sm:py-4 border-t border-[#E5EAF2] flex items-center justify-end gap-3 shrink-0 bg-[#F7F8FF]">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-5 py-2.5 rounded-xl border border-[#E5EAF2] font-bold text-slate-600 hover:bg-slate-100 transition text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="edit-listing-form"
                disabled={isSavingEdit}
                className="px-6 py-2.5 bg-gradient-to-r from-[#633BFF] to-[#536BFF] hover:brightness-110 disabled:opacity-50 text-white font-bold rounded-xl shadow-md transition flex items-center gap-2 text-xs"
              >
                {isSavingEdit && <Loader2 className="w-4 h-4 animate-spin" />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== DELETE CONFIRMATION MODAL ===================== */}
      {isDeleteModalOpen && (
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsDeleteModalOpen(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#11102B]/70 backdrop-blur-sm animate-fade-in"
        >
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl p-6 sm:p-7 space-y-5">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-xl font-black text-[#15152D]">
                Delete Listing?
              </h3>
              <p className="text-xs text-[#718096] leading-relaxed">
                Are you sure you want to delete <strong className="text-[#15152D]">"{auction.title}"</strong>? 
                {hasBids ? (
                  <span className="block mt-1 text-amber-600 font-semibold">
                    Warning: This listing has {bids.length} placed bid(s). Deleting will remove all bids and notify participating bidders.
                  </span>
                ) : (
                  <span className="block mt-1">
                    This action cannot be undone. All listing details will be permanently removed.
                  </span>
                )}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isDeleting}
                className="py-2.5 px-4 rounded-xl border border-slate-200 font-bold text-xs text-[#15152D] hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
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

      {/* Handover Pass & Verification Modal */}
      <HandoverPassModal
        listingId={id as string}
        isOpen={isHandoverPassOpen}
        onClose={() => setIsHandoverPassOpen(false)}
        onHandoverComplete={() => {
          fetchAuction();
        }}
      />
    </div>
  );
}
