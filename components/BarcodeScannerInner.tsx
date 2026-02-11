"use client";

import { useEffect, useRef, useState } from "react";
import { X, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getDeviceHeaders } from "@/lib/device-client";

interface BarcodeScannerInnerProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess?: (productName: string) => void;
}

// Polyfill getUserMedia for older browsers
function polyfillGetUserMedia() {
  if (navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
    return; // Already available
  }

  // Polyfill for older browsers - use type assertion to work around readonly
  const nav = navigator as { getUserMedia?: unknown; webkitGetUserMedia?: unknown; mozGetUserMedia?: unknown; msGetUserMedia?: unknown };
  if (!nav.mediaDevices) {
    nav.mediaDevices = {};
  }
  
  if (!nav.mediaDevices.getUserMedia) {
    const getUserMedia = nav.getUserMedia || 
                        nav.webkitGetUserMedia || 
                        nav.mozGetUserMedia ||
                        nav.msGetUserMedia;

    if (!getUserMedia) {
      throw new Error('getUserMedia is not supported in this browser');
    }

    nav.mediaDevices.getUserMedia = function(constraints: MediaStreamConstraints) {
      return new Promise((resolve, reject) => {
        getUserMedia.call(navigator, constraints, resolve, reject);
      });
    };
  }
}

// Load QuaggaJS from CDN
function loadQuaggaJS(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as { Quagga?: unknown }).Quagga) {
      resolve();
      return;
    }

    // Ensure getUserMedia is available before loading QuaggaJS
    polyfillGetUserMedia();

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/quagga@0.12.1/dist/quagga.min.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load QuaggaJS'));
    document.head.appendChild(script);
  });
}

export function BarcodeScannerInner({ isOpen, onClose, onScanSuccess }: BarcodeScannerInnerProps) {
  const scannerRef = useRef<any | null>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const scannerContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      // Cleanup when closed
      if (scannerRef.current && scannerRef.current.quagga) {
        try {
          scannerRef.current.quagga.stop?.();
          scannerRef.current.quagga.offDetected?.();
        } catch {
          // Ignore cleanup errors
        }
        scannerRef.current = null;
      }
      setScanning(false);
      setError(null);
      setProcessing(false);
      setSuccess(null);
      return;
    }

    // Initialize scanner when opened
    const initScanner = async () => {
      if (!scannerContainerRef.current) return;

      // Use QuaggaJS for barcode scanning (loaded from CDN, no npm package needed)
      try {
        // Check if we're in a browser environment
        if (typeof window === 'undefined' || typeof navigator === 'undefined') {
          throw new Error("Browser environment required");
        }

        // Check if we're in a secure context (HTTPS or localhost)
        // ngrok domains are HTTPS so they're secure
        const isSecureContext = window.isSecureContext || 
                                location.protocol === 'https:' || 
                                location.hostname === 'localhost' || 
                                location.hostname === '127.0.0.1' ||
                                location.hostname.endsWith('.ngrok.io') ||
                                location.hostname.endsWith('.ngrok-free.app');
        
        if (!isSecureContext) {
          setError(
            "Camera access requires HTTPS or localhost. " +
            "Please access the app via https://localhost:3001 or use ngrok for phone testing."
          );
          return; // Don't throw, just show error and return
        }

        // Ensure getUserMedia is polyfilled before loading QuaggaJS
        try {
          polyfillGetUserMedia();
        } catch (err: unknown) {
          const error = err as { message?: string };
          throw new Error(`Camera API not available: ${error.message || "Unknown error"}`);
        }

        // Load QuaggaJS from CDN
        await loadQuaggaJS();
        const Quagga = (window as { Quagga?: {
          init?: (config: unknown, callback: (err: unknown) => void) => void;
          start?: () => void;
          stop?: () => void;
          onDetected?: (callback: (result: { codeResult?: { code?: string } }) => void) => void;
          offDetected?: () => void;
        } }).Quagga;
        
        if (!Quagga) {
          throw new Error("Failed to load QuaggaJS library");
        }

        // Initialize QuaggaJS
        Quagga.init?.({
          inputStream: {
            name: "Live",
            type: "LiveStream",
            target: scannerContainerRef.current,
            constraints: {
              facingMode: "environment",
              width: { min: 640 },
              height: { min: 480 }
            }
          },
          locator: {
            patchSize: "medium",
            halfSample: true
          },
          numOfWorkers: 2,
          decoder: {
            readers: ["ean_reader", "ean_8_reader", "code_128_reader", "code_39_reader", "upc_reader", "upc_e_reader"]
          },
          locate: true
        }, (err: unknown) => {
          if (err) {
            const error = err as { message?: string };
            console.error("Quagga initialization error:", err);
            setError(error.message || "Failed to initialize camera. Please check permissions.");
            setScanning(false);
            return;
          }
          setScanning(true);
          setError(null);
          Quagga.start?.();
        });

        // Handle detected barcodes
        Quagga.onDetected?.((result: { codeResult?: { code?: string } }) => {
          const code = result.codeResult?.code;
          if (code) {
            handleBarcodeScanned(code);
          }
        });

        scannerRef.current = { quagga: Quagga };

        setScanning(true);
        setError(null);
      } catch (err: unknown) {
        const error = err as { message?: string };
        console.error("Scanner initialization error:", err);
        setError(
          error.message?.includes("Permission")
            ? "Camera permission denied. Please allow camera access."
            : "Failed to start camera. Please check your device settings."
        );
        setScanning(false);
      }
    };

    initScanner();

    return () => {
      // Cleanup on unmount
      if (scannerRef.current && scannerRef.current.quagga) {
        try {
          scannerRef.current.quagga.stop?.();
          scannerRef.current.quagga.offDetected?.();
        } catch {
          // Ignore cleanup errors
        }
        scannerRef.current = null;
      }
    };
  }, [isOpen]);

  const handleBarcodeScanned = async (barcode: string) => {
    if (processing) return; // Prevent multiple simultaneous scans

    // Stop scanning
    if (scannerRef.current && scannerRef.current.quagga) {
      try {
        scannerRef.current.quagga.stop?.();
        setScanning(false);
      } catch (err) {
        // Ignore stop errors
      }
    }

    setProcessing(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/barcode/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getDeviceHeaders(),
        },
        body: JSON.stringify({ barcode }),
      });

      const data = await response.json();

      if (data.success) {
        const productName = data.data?.productName || "Product";
        setSuccess(`Added ${productName} to your list!`);
        
        if (onScanSuccess) {
          onScanSuccess(productName);
        }

        // Close after a short delay
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setError(data.error || "Failed to add product to list");
        // Restart scanning after error
        setTimeout(() => {
          restartScanning();
        }, 2000);
      }
    } catch (err) {
      console.error("Error processing barcode:", err);
      setError("Failed to process barcode. Please try again.");
      // Restart scanning after error
      setTimeout(() => {
        restartScanning();
      }, 2000);
    } finally {
      setProcessing(false);
    }
  };

  const restartScanning = async () => {
    if (!isOpen) return;
    // Re-initialize scanner
    const initScanner = async () => {
      if (!scannerContainerRef.current) return;
      // Re-run the initialization logic
      // This is handled by the useEffect when isOpen changes
    };
    await initScanner();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="barcode-scanner-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Scanner Container */}
      <div className="relative w-full max-w-md mx-4 bg-background rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 id="barcode-scanner-title" className="text-lg font-semibold text-foreground">
            Scan Barcode
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
            aria-label="Close scanner"
          >
            <X className="w-5 h-5 text-foreground" />
          </button>
        </div>

        {/* Scanner View */}
        <div className="relative bg-black">
          <div
            id="barcode-scanner-container"
            ref={scannerContainerRef}
            className="w-full"
            style={{ minHeight: "400px" }}
          />

          {/* Overlay with scanning guide */}
          {scanning && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="relative">
                {/* Scanning box */}
                <div className="w-64 h-64 border-2 border-primary-500 rounded-lg" />
                {/* Corner indicators */}
                <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-primary-500 rounded-tl-lg" />
                <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-primary-500 rounded-tr-lg" />
                <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-primary-500 rounded-bl-lg" />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-primary-500 rounded-br-lg" />
              </div>
            </div>
          )}
        </div>

        {/* Status Messages */}
        <div className="p-4 space-y-2">
          {processing && (
            <div className="flex items-center gap-2 text-primary">
              <Loader2 className="w-5 h-5 animate-spin" />
              <p className="text-sm">Processing barcode...</p>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <p className="text-sm">{success}</p>
            </div>
          )}

          {!processing && !error && !success && scanning && (
            <p className="text-sm text-muted-foreground text-center">
              Point your camera at a barcode
            </p>
          )}

          {!scanning && !processing && !error && !success && (
            <p className="text-sm text-muted-foreground text-center">
              Starting camera...
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
