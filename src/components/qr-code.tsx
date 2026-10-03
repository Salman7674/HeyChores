'use client';

import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface QRCodeDisplayProps {
  text: string;
  size?: number;
}

export function QRCodeDisplay({ text, size = 180 }: QRCodeDisplayProps) {
  const [dataUrl, setDataUrl] = useState<string>('');

  useEffect(() => {
    QRCode.toDataURL(text, {
      width: size,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((url) => setDataUrl(url))
      .catch((err) => console.error('Failed to generate QR code:', err));
  }, [text, size]);

  if (!dataUrl) {
    return (
      <div
        style={{ width: size, height: size }}
        className="bg-slate-800/50 animate-pulse rounded-xl flex items-center justify-center text-xs text-slate-400"
      >
        Generating QR...
      </div>
    );
  }

  return (
    <div className="bg-white p-3 rounded-2xl shadow-xl inline-block border border-slate-200">
      <img src={dataUrl} alt="Group Invite QR Code" className="rounded-lg" width={size} height={size} />
    </div>
  );
}
