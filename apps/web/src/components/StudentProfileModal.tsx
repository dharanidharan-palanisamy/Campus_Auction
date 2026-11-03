'use client';

import React, { useState, useEffect } from 'react';
import { 
  User, 
  Mail, 
  AtSign, 
  GraduationCap, 
  Building2, 
  Phone, 
  FileText, 
  Camera, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  X,
  Pencil
} from 'lucide-react';
import { ImageDropzone } from './ImageDropzone';

interface StudentProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: any;
  onProfileUpdated: (updatedUser: any) => void;
}

export function StudentProfileModal({
  isOpen,
  onClose,
  profile,
  onProfileUpdated,
}: StudentProfileModalProps) {
  const [fullName, setFullName] = useState('');
  const [campusAlias, setCampusAlias] = useState('');
  const [department, setDepartment] = useState('');
  const [college, setCollege] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  const [saving, setSaving] = useState(false);
  const [deletingField, setDeletingField] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Populate form with current values
  useEffect(() => {
    if (profile) {
      setFullName(profile.fullName || '');
      setCampusAlias(profile.campusAlias || '');
      setDepartment(profile.department || '');
      setCollege(profile.college || '');
      setPhone(profile.phone || '');
      setBio(profile.bio || '');
      setAvatarUrl(profile.avatarUrl || '');
    }
  }, [profile, isOpen]);

  // Handle Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const token = localStorage.getItem('campus_token');
      const res = await fetch('http://localhost:4000/api/v1/student/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token || ''}`,
        },
        body: JSON.stringify({
          fullName,
          campusAlias,
          department,
          college,
          phone,
          bio,
          avatarUrl,
        }),
      });

      const resData = await res.json();
      if (res.ok && resData.success) {
        setSuccessMsg('Personal details updated successfully!');
        onProfileUpdated(resData.data);
        setTimeout(() => {
          onClose();
        }, 600);
      } else {
        setErrorMsg(resData.message || 'Failed to update personal details');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error');
    } finally {
      setSaving(false);
    }
  };

  // Delete specific optional detail
  const handleDeleteField = async (fieldName: string) => {
    if (!confirm(`Are you sure you want to remove your ${fieldName}?`)) return;

    setDeletingField(fieldName);
    setErrorMsg('');
    try {
      const token = localStorage.getItem('campus_token');
      const res = await fetch(`http://localhost:4000/api/v1/student/profile/field/${fieldName}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token || ''}`,
        },
      });
      const resData = await res.json();
      if (res.ok && resData.success) {
        if (fieldName === 'department') setDepartment('');
        if (fieldName === 'college') setCollege('');
        if (fieldName === 'phone') setPhone('');
        if (fieldName === 'bio') setBio('');
        if (fieldName === 'avatarUrl') setAvatarUrl('');
        onProfileUpdated(resData.data);
      } else {
        setErrorMsg(resData.message || `Failed to delete ${fieldName}`);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error deleting field');
    } finally {
      setDeletingField(null);
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
    >
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95">
        {/* Sticky Header */}
        <div className="px-6 py-4 sm:px-8 sm:py-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl">
              <Pencil className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-slate-900">
                Personal Profile Details
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Add, edit, or remove your campus identity & contact details
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="overflow-y-auto px-6 py-5 sm:px-8 sm:py-6 space-y-5 flex-1 min-h-0 text-xs">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          <form id="edit-profile-form" onSubmit={handleSave} className="space-y-4">
            {/* Student ID & Email (Immutable Institutional Credentials) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  University Student ID (Official)
                </span>
                <span className="text-sm font-black text-slate-700 block">
                  {profile.studentId || 'Not Assigned'}
                </span>
                <span className="text-[10px] text-slate-400">Institutional ID cannot be altered</span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Campus Email Address
                </span>
                <span className="text-sm font-semibold text-slate-700 block truncate">
                  {profile.email}
                </span>
                <span className="text-[10px] text-emerald-600 font-semibold">✓ Verified Domain</span>
              </div>
            </div>

            {/* Full Name & Campus Alias */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Aarav Sharma"
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Campus Alias / Username *
                </label>
                <div className="relative">
                  <AtSign className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={campusAlias}
                    onChange={(e) => setCampusAlias(e.target.value)}
                    placeholder="e.g. Aarav_Tech"
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Department & College */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold uppercase tracking-wider text-slate-500">
                    Department / Major
                  </label>
                  {department && (
                    <button
                      type="button"
                      onClick={() => handleDeleteField('department')}
                      disabled={deletingField === 'department'}
                      className="text-[10px] text-rose-500 hover:text-rose-700 flex items-center gap-0.5"
                    >
                      <Trash2 className="w-3 h-3" /> Remove
                    </button>
                  )}
                </div>
                <div className="relative">
                  <GraduationCap className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="e.g. Computer Science & Engineering"
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold uppercase tracking-wider text-slate-500">
                    College / Campus Branch
                  </label>
                  {college && (
                    <button
                      type="button"
                      onClick={() => handleDeleteField('college')}
                      disabled={deletingField === 'college'}
                      className="text-[10px] text-rose-500 hover:text-rose-700 flex items-center gap-0.5"
                    >
                      <Trash2 className="w-3 h-3" /> Remove
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={college}
                    onChange={(e) => setCollege(e.target.value)}
                    placeholder="e.g. Main Technology Campus"
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Phone Number */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold uppercase tracking-wider text-slate-500">
                  Campus Handover Phone / WhatsApp (Optional)
                </label>
                {phone && (
                  <button
                    type="button"
                    onClick={() => handleDeleteField('phone')}
                    disabled={deletingField === 'phone'}
                    className="text-[10px] text-rose-500 hover:text-rose-700 flex items-center gap-0.5"
                  >
                    <Trash2 className="w-3 h-3" /> Remove Phone
                  </button>
                )}
              </div>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +91 98765 43210 (shared with confirmed handover partners only)"
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Bio / About */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold uppercase tracking-wider text-slate-500">
                  Short Student Bio / Notes
                </label>
                {bio && (
                  <button
                    type="button"
                    onClick={() => handleDeleteField('bio')}
                    disabled={deletingField === 'bio'}
                    className="text-[10px] text-rose-500 hover:text-rose-700 flex items-center gap-0.5"
                  >
                    <Trash2 className="w-3 h-3" /> Clear Bio
                  </button>
                )}
              </div>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Share your interests, dorm location, or preferred meeting times..."
                className="w-full p-3.5 text-sm bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
              />
            </div>

            {/* Custom Avatar Photo Uploader */}
            <div className="pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <label className="font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-indigo-600" />
                  Custom Profile Avatar Photo
                </label>
                {avatarUrl && (
                  <button
                    type="button"
                    onClick={() => handleDeleteField('avatarUrl')}
                    disabled={deletingField === 'avatarUrl'}
                    className="text-[10px] text-rose-500 hover:text-rose-700 flex items-center gap-0.5"
                  >
                    <Trash2 className="w-3 h-3" /> Revert to Initials Avatar
                  </button>
                )}
              </div>
              <ImageDropzone
                value={avatarUrl}
                onChange={setAvatarUrl}
                label="Profile Picture"
                required={false}
              />
            </div>
          </form>
        </div>

        {/* Sticky Footer Action Bar */}
        <div className="px-6 py-4 sm:px-8 sm:py-4 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0 bg-slate-50/90">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-100 transition text-xs"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="edit-profile-form"
            disabled={saving}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Save Personal Details
          </button>
        </div>
      </div>
    </div>
  );
}

