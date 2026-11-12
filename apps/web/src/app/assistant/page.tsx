'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { formatINR } from '@/lib/utils';
import { API_BASE } from '@/lib/api';
import { 
  Sparkles, 
  Send, 
  ShieldAlert, 
  CheckCircle2, 
  ArrowRight, 
  Loader2,
  Bot,
  User as UserIcon,
  HelpCircle,
  TrendingUp,
  Gavel
} from 'lucide-react';

interface Proposal {
  action: string;
  listingId: string;
  title: string;
  currentLeadingBid: number;
  minAcceptable: number;
  proposedAmountInCents: number;
  isEligible: boolean;
  requiresConfirmation: boolean;
}

const QUICK_PROMPTS = [
  'Find bicycles under ₹3,000',
  'Show scientific calculators below ₹800',
  'What textbooks are ending today?',
  'Prepare bid of 1500 for mechanical keyboard'
];

export default function AssistantPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Array<{ sender: 'user' | 'assistant'; text: string; proposal?: Proposal }>>([
    {
      sender: 'assistant',
      text: `Hello ${user?.campusAlias || 'there'}! I am your Campus Auction Assistant. You can ask me to find items within your budget, check price intelligence, or prepare a verified bid proposal with built-in anti-sniping protection.`,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmedBids, setConfirmedBids] = useState<{ [listingId: string]: boolean }>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    setInput('');
    setMessages((prev) => [...prev, { sender: 'user', text: textToSend }]);
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/assistant/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('campus_token') || ''}`,
        },
        body: JSON.stringify({ message: textToSend }),
      });

      const data = await res.json();
      if (data.success) {
        setMessages((prev) => [
          ...prev,
          { sender: 'assistant', text: data.reply, proposal: data.proposal },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { sender: 'assistant', text: data.message || 'Sorry, I encountered an issue analyzing the auctions.' },
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { sender: 'assistant', text: 'Unable to reach the campus assistant service right now.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendMessage(input);
  };

  const handleConfirmBid = async (proposal: Proposal) => {
    try {
      const res = await fetch(`${API_BASE}/assistant/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('campus_token') || ''}`,
        },
        body: JSON.stringify({
          listingId: proposal.listingId,
          amountInCents: proposal.proposedAmountInCents,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setConfirmedBids((prev) => ({ ...prev, [proposal.listingId]: true }));
        setMessages((prev) => [
          ...prev,
          {
            sender: 'assistant',
            text: `Authorized & Placed! Your bid of ${formatINR(proposal.proposedAmountInCents)} on "${proposal.title}" has been successfully recorded on the campus ledger.`,
          },
        ]);
      } else {
        alert(data.message || 'Bid confirmation failed');
      }
    } catch (err: any) {
      alert(err.message || 'Network error');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-10">
      <div className="bg-white rounded-3xl border border-[#E5EAF2] shadow-xl overflow-hidden flex flex-col h-[750px]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#E5EAF2] bg-gradient-to-r from-indigo-50/80 via-white to-blue-50/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#5145FF] to-[#3563FF] text-white flex items-center justify-center shadow-md shadow-indigo-100">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-black text-[#11182D] text-base">Campus Auction Assistant</h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Online
                </span>
              </div>
              <p className="text-xs text-[#718096]">Natural language search & verified bid proposals</p>
            </div>
          </div>
          <div className="hidden sm:block text-right">
            <span className="text-[11px] font-bold text-[#5145FF] bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
              Strict Confirmation Guard
            </span>
          </div>
        </div>

        {/* Chat message history */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-[#F7F9FC]">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div className="flex items-start gap-2 max-w-[90%] sm:max-w-[80%]">
                {m.sender === 'assistant' && (
                  <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-[#5145FF] to-[#3563FF] text-white flex items-center justify-center shrink-0 mt-0.5 text-xs shadow-xs">
                    <Bot className="w-4 h-4" />
                  </div>
                )}
                <div
                  className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-[#5145FF] text-white rounded-br-none shadow-sm shadow-indigo-100'
                      : 'bg-white text-[#151B2C] border border-[#E5EAF2] rounded-bl-none shadow-xs'
                  }`}
                >
                  <div className="whitespace-pre-line">{m.text}</div>

                  {/* Proposal Card */}
                  {m.proposal && (
                    <div className="mt-4 p-4 rounded-xl bg-indigo-50/70 border border-indigo-200 text-[#151B2C]">
                      <div className="flex items-center gap-2 mb-2">
                        <Gavel className="w-4 h-4 text-[#5145FF]" />
                        <span className="font-black text-xs text-[#5145FF] uppercase tracking-wider">
                          Ready for Your Authorization
                        </span>
                      </div>

                      <h4 className="font-bold text-sm text-[#11182D] mb-2">{m.proposal.title}</h4>

                      <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                        <div className="bg-white p-2.5 rounded-lg border border-[#E5EAF2]">
                          <span className="text-[10px] uppercase font-bold text-[#718096] block">Leading Bid</span>
                          <span className="font-black text-[#151B2C] text-sm">
                            {formatINR(m.proposal.currentLeadingBid)}
                          </span>
                        </div>
                        <div className="bg-white p-2.5 rounded-lg border border-[#E5EAF2]">
                          <span className="text-[10px] uppercase font-bold text-[#718096] block">Proposed Bid</span>
                          <span className="font-black text-[#5145FF] text-sm">
                            {formatINR(m.proposal.proposedAmountInCents)}
                          </span>
                        </div>
                      </div>

                      {confirmedBids[m.proposal.listingId] ? (
                        <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-100/80 p-2.5 rounded-xl font-bold text-xs">
                          <CheckCircle2 className="w-4 h-4" />
                          Bid Placed Successfully
                        </div>
                      ) : (
                        <button
                          onClick={() => handleConfirmBid(m.proposal!)}
                          className="w-full py-2.5 px-4 rounded-xl bg-[#5145FF] hover:bg-[#4338CA] text-white font-bold text-xs transition shadow-xs flex items-center justify-center gap-2 active:scale-[0.98]"
                        >
                          Confirm & Submit Bid ({formatINR(m.proposal.proposedAmountInCents)})
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-[#718096] text-xs">
              <div className="w-7 h-7 rounded-xl bg-white border border-[#E5EAF2] flex items-center justify-center">
                <Loader2 className="w-4 h-4 text-[#5145FF] animate-spin" />
              </div>
              <span className="bg-white px-3 py-1.5 rounded-xl border border-[#E5EAF2] text-xs font-semibold">
                Assistant is thinking...
              </span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggestion pills if conversation is short */}
        {messages.length <= 2 && (
          <div className="px-4 py-2.5 bg-white border-t border-[#E5EAF2] overflow-x-auto scrollbar-none flex items-center gap-2">
            <span className="text-[11px] font-bold text-[#718096] shrink-0">Try asking:</span>
            {QUICK_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                onClick={() => sendMessage(prompt)}
                className="shrink-0 text-xs font-semibold px-3 py-1 rounded-lg bg-[#F7F9FC] border border-[#E5EAF2] text-[#151B2C] hover:border-indigo-300 hover:text-[#5145FF] transition whitespace-nowrap"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleSend} className="p-3.5 sm:p-4 bg-white border-t border-[#E5EAF2]">
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder={user ? "Ask anything: 'Find calculators under 800' or 'Bid 3000 on cycle'..." : "Please log in to chat with Assistant..."}
              value={input}
              disabled={loading || !user}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 bg-[#F7F9FC] border border-[#E5EAF2] rounded-xl px-4 py-2.5 text-xs sm:text-sm text-[#151B2C] placeholder:text-[#718096] focus:outline-none focus:border-[#5145FF] focus:ring-2 focus:ring-indigo-100 transition disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={loading || !input.trim() || !user}
              className="bg-[#5145FF] hover:bg-[#4338CA] text-white p-2.5 rounded-xl transition shadow-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
