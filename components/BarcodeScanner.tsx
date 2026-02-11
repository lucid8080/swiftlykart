"use client";

import dynamic from "next/dynamic";

// Dynamically import the scanner component to avoid SSR issues with html5-qrcode
const BarcodeScannerInner = dynamic(
  () => import("./BarcodeScannerInner").then((mod) => ({ default: mod.BarcodeScannerInner })),
  {
    ssr: false,
    loading: () => (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
        <div className="text-white">Loading scanner...</div>
      </div>
    ),
  }
);

interface BarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess?: (productName: string) => void;
}

export function BarcodeScanner({ isOpen, onClose, onScanSuccess }: BarcodeScannerProps) {
  if (!isOpen) return null;

  return (
    <BarcodeScannerInner
      isOpen={isOpen}
      onClose={onClose}
      onScanSuccess={onScanSuccess}
    />
  );
}
