'use client';

import React, { useState, useRef, useCallback } from 'react';
import { UploadCloud, Image as ImageIcon, X, RefreshCw, Link as LinkIcon, CheckCircle2 } from 'lucide-react';

interface ImageDropzoneProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  required?: boolean;
}

export function ImageDropzone({
  value,
  onChange,
  label = 'Product Image',
  required = true,
}: ImageDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Resize and compress dropped image using HTML Canvas
  const processImageFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (PNG, JPG, WEBP, etc.)');
      return;
    }

    setIsProcessing(true);
    const reader = new FileReader();

    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onload = () => {
        const MAX_WIDTH = 1280;
        const MAX_HEIGHT = 1280;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            width = MAX_HEIGHT;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          // Export as compressed JPEG Data URL
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
          onChange(compressedDataUrl);
        } else {
          onChange(readerEvent.target?.result as string);
        }
        setIsProcessing(false);
      };

      img.onerror = () => {
        setIsProcessing(false);
        alert('Failed to process image file.');
      };

      img.src = readerEvent.target?.result as string;
    };

    reader.onerror = () => {
      setIsProcessing(false);
      alert('Error reading file.');
    };

    reader.readAsDataURL(file);
  }, [onChange]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processImageFile(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processImageFile(e.target.files[0]);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const hasImage = Boolean(value && value.trim().length > 0);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
          {label} {required && <span className="text-indigo-600">*</span>}
        </label>
        <button
          type="button"
          onClick={() => setShowUrlInput(!showUrlInput)}
          className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1 transition"
        >
          <LinkIcon className="w-3 h-3" />
          {showUrlInput ? 'Hide URL input' : 'Enter image URL instead'}
        </button>
      </div>

      {/* Hidden native file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Drag & Drop Box */}
      {!hasImage ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
            isDragging
              ? 'border-indigo-500 bg-indigo-50/80 scale-[1.01]'
              : 'border-slate-300 bg-slate-50 hover:bg-slate-100/80 hover:border-indigo-400'
          }`}
        >
          <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center shadow-inner">
            {isProcessing ? (
              <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
            ) : (
              <UploadCloud className="w-6 h-6" />
            )}
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800">
              {isProcessing
                ? 'Processing & optimizing photo...'
                : isDragging
                ? 'Drop your photo here!'
                : 'Drag & drop product photo here'}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              or <span className="text-indigo-600 font-semibold underline">browse from your device</span> (PNG, JPG, WEBP)
            </p>
          </div>
        </div>
      ) : (
        /* Image Preview Card */
        <div className="relative rounded-2xl border border-slate-200 overflow-hidden bg-slate-900 group">
          <div className="aspect-[16/9] sm:aspect-[21/9] max-h-60 w-full overflow-hidden flex items-center justify-center bg-slate-950">
            <img
              src={value}
              alt="Listing preview"
              className="w-full h-full object-contain"
              onError={() => {
                // Graceful fallback if URL fails
              }}
            />
          </div>

          {/* Overlay controls */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/20 flex flex-col justify-between p-3 pointer-events-none">
            <div className="flex items-center justify-between pointer-events-auto">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/90 text-white font-bold text-[11px] shadow-sm backdrop-blur-sm">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Photo Uploaded
              </span>
              <button
                type="button"
                onClick={handleRemove}
                className="p-1.5 rounded-lg bg-slate-900/80 hover:bg-rose-600 text-white transition backdrop-blur-sm shadow-sm"
                title="Remove photo"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-between pointer-events-auto">
              <span className="text-[11px] text-slate-300 truncate max-w-[200px]">
                {value.startsWith('data:') ? 'Custom uploaded image' : value}
              </span>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 rounded-lg bg-white/90 hover:bg-white text-slate-900 font-bold text-xs shadow-md transition backdrop-blur-sm flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Change Photo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Optional Web URL Input */}
      {showUrlInput && (
        <div className="pt-1.5 animate-in fade-in duration-200">
          <input
            type="url"
            placeholder="Paste direct image link (e.g. https://...)"
            value={value.startsWith('data:') ? '' : value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3.5 py-2 text-xs font-mono bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
          />
        </div>
      )}
    </div>
  );
}

