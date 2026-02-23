"use client";

import { useEffect, useRef, useState } from "react";
import { X, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { getDeviceHeaders } from "@/lib/device-client";
import { getAnonVisitorId } from "@/lib/identity-client";

// Type for Html5Qrcode instance
type Html5QrcodeInstance = {
  start: (
    cameraId: string,
    config: {
      fps: number;
      qrbox: { width: number; height: number };
      aspectRatio: number;
      disableFlip: boolean;
    },
    onScanSuccess: (decodedText: string) => void,
    onScanError: (errorMessage: string) => void
  ) => Promise<void>;
  stop: () => Promise<void>;
  clear: () => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
};

type Html5QrcodeStatic = {
  new (elementId: string): Html5QrcodeInstance;
  getCameras: () => Promise<Array<{ id: string; label: string }>>;
};

let Html5Qrcode: Html5QrcodeStatic | null = null;

interface BarcodeScannerInnerProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess?: (productName: string) => void;
}

export function BarcodeScannerInner({ isOpen, onClose, onScanSuccess }: BarcodeScannerInnerProps) {
  const scannerRef = useRef<Html5QrcodeInstance | null>(null);
  const scannerContainerRef = useRef<HTMLDivElement>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [cameraId, setCameraId] = useState<string | null>(null);
  const lastScannedBarcodeRef = useRef<string | null>(null);
  const lastScanTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!isOpen) {
      // Cleanup when closed
      stopScanner();
      setScanning(false);
      setError(null);
      setProcessing(false);
      setSuccess(null);
      setCameraId(null);
      return;
    }

    // Initialize scanner when opened
    const initScanner = async () => {
      if (!scannerContainerRef.current) return;

      // Load html5-qrcode dynamically
      if (typeof window === "undefined" || !Html5Qrcode) {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const html5QrcodeModule = require("html5-qrcode");
        Html5Qrcode = html5QrcodeModule.Html5Qrcode as Html5QrcodeStatic;
      }
      
      if (!Html5Qrcode) {
        throw new Error("Failed to load html5-qrcode library");
      }

      try {
        // Check if we're in a browser environment
        if (typeof window === 'undefined' || typeof navigator === 'undefined') {
          throw new Error("Browser environment required");
        }

        // Check if we're in a secure context (HTTPS or localhost)
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
          return;
        }

        // Create Html5Qrcode instance
        const html5QrCode = new Html5Qrcode!(scannerContainerRef.current.id);
        scannerRef.current = html5QrCode;

        // Get available cameras and prefer back camera
        const devices = await Html5Qrcode!.getCameras() as Array<{ id: string; label: string }>;
        if (devices.length === 0) {
          throw new Error("No cameras found. Please check your device permissions.");
        }

        // Prefer back camera (environment facing) for barcode scanning
        const backCamera = devices.find((device: { id: string; label: string }) => 
          device.label.toLowerCase().includes('back') || 
          device.label.toLowerCase().includes('rear') ||
          device.label.toLowerCase().includes('environment')
        );
        
        const selectedCameraId = backCamera?.id || devices[0].id;
        setCameraId(selectedCameraId);

        // Start scanning
        await html5QrCode.start(
          selectedCameraId,
          {
            fps: 10, // Frames per second
            qrbox: { width: 250, height: 250 }, // Scanning box size
            aspectRatio: 1.0, // Square aspect ratio
            disableFlip: false, // Allow flip for better detection
          },
          (decodedText: string) => {
            // Barcode detected
            handleBarcodeScanned(decodedText);
          },
          (errorMessage: string) => {
            // Ignore scanning errors (just means no barcode detected yet)
            // Only log if it's not a "not found" error
            if (!errorMessage.includes("No QR code") && !errorMessage.includes("No MultiFormat Readers")) {
              console.debug("Scanning:", errorMessage);
            }
          }
        );

        setScanning(true);
        setError(null);
      } catch (err: unknown) {
        const error = err as { message?: string };
        console.error("Scanner initialization error:", err);
        
        if (error.message?.includes("Permission")) {
          setError("Camera permission denied. Please allow camera access in your browser settings.");
        } else if (error.message?.includes("NotAllowedError")) {
          setError("Camera access denied. Please allow camera access and try again.");
        } else if (error.message?.includes("NotFoundError")) {
          setError("No camera found. Please check your device has a camera.");
        } else {
          setError(error.message || "Failed to start camera. Please check your device settings.");
        }
        setScanning(false);
        stopScanner();
      }
    };

    initScanner();

    return () => {
      // Cleanup on unmount
      stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        // Stop scanning and clear the view
        await scannerRef.current.stop();
        await scannerRef.current.clear();
      } catch (err) {
        // Ignore cleanup errors (scanner might already be stopped)
        console.debug("Scanner cleanup:", err);
      }
      scannerRef.current = null;
    }
  };

  const handleBarcodeScanned = async (barcode: string) => {
    // Debounce: prevent processing the same barcode multiple times in quick succession
    const now = Date.now();
    const timeSinceLastScan = now - lastScanTimeRef.current;
    
    // If same barcode scanned within 2 seconds, ignore it
    if (barcode === lastScannedBarcodeRef.current && timeSinceLastScan < 2000) {
      console.debug("Ignoring duplicate scan:", barcode);
      return;
    }
    
    if (processing) {
      console.debug("Already processing a scan, ignoring:", barcode);
      return; // Prevent multiple simultaneous scans
    }

    // Update refs
    lastScannedBarcodeRef.current = barcode;
    lastScanTimeRef.current = now;

    console.log("Processing barcode scan:", barcode);

    // Stop scanning but keep camera visible
    if (scannerRef.current) {
      try {
        await scannerRef.current.pause();
      } catch (err) {
        console.debug("Error pausing scanner:", err);
      }
    }

    setProcessing(true);
    setError(null);
    setSuccess(null);

    try {
      // Get anonVisitorId using the same utility function as /list page
      // This ensures we create one if it doesn't exist
      // Wrap in try-catch to ensure scanning continues even if this fails
      let anonVisitorId: string | null = null;
      try {
        anonVisitorId = getAnonVisitorId();
        if (anonVisitorId) {
          console.log("[Barcode Scanner] Found anonVisitorId, will send to API");
        } else {
          console.log("[Barcode Scanner] No anonVisitorId available");
        }
      } catch (idError) {
        // If getting anonVisitorId fails, continue without it
        console.warn("[Barcode Scanner] Failed to get anonVisitorId, continuing without it:", idError);
      }

      const requestBody: { barcode: string; anonVisitorId?: string } = { barcode };
      if (anonVisitorId) {
        requestBody.anonVisitorId = anonVisitorId;
      }

      const response = await fetch("/api/barcode/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getDeviceHeaders(),
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (data.success) {
        const productName = data.data?.productName || "Product";
        setSuccess(`Added ${productName} to your list!`);
        setProcessing(false); // Stop showing processing state
        
        // Dispatch custom event for /list page to listen to
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("barcodeScanSuccess", {
            detail: { productName },
          }));
        }
        
        // Call onScanSuccess immediately (triggers list refresh in background)
        if (onScanSuccess) {
          onScanSuccess(productName);
        }

        // Close after a short delay to show success message
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        const errorMessage = data.error || "Failed to add product to list";
        console.error("Barcode scan failed:", { barcode, error: errorMessage, code: data.code });
        setError(errorMessage);
        setProcessing(false);
        // Resume scanning after error
        if (scannerRef.current && cameraId) {
          try {
            await scannerRef.current.resume();
          } catch (err) {
            console.debug("Error resuming scanner:", err);
            // If resume fails, restart scanner
            setTimeout(() => {
              restartScanning();
            }, 1000);
          }
        }
      }
    } catch (err) {
      console.error("Error processing barcode:", { barcode, error: err });
      setError("Failed to process barcode. Please try again.");
      // Resume scanning after error
      if (scannerRef.current && cameraId) {
        try {
          await scannerRef.current.resume();
        } catch (err) {
          console.debug("Error resuming scanner:", err);
          // If resume fails, restart scanner
          setTimeout(() => {
            restartScanning();
          }, 1000);
        }
      }
      setProcessing(false);
    }
  };

  const restartScanning = async () => {
    if (!isOpen || !scannerContainerRef.current || !cameraId || !Html5Qrcode) return;

    try {
      await stopScanner();
      
      const html5QrCode = new Html5Qrcode(scannerContainerRef.current.id);
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        cameraId,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
          disableFlip: false,
        },
        (decodedText: string) => {
          handleBarcodeScanned(decodedText);
        },
        (errorMessage: string) => {
          if (!errorMessage.includes("No QR code") && !errorMessage.includes("No MultiFormat Readers")) {
            console.debug("Scanning:", errorMessage);
          }
        }
      );

      setScanning(true);
      setError(null);
      setProcessing(false);
    } catch (err) {
      console.error("Error restarting scanner:", err);
      setError("Failed to restart camera. Please close and try again.");
    }
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
            style={{ minHeight: "400px", position: "relative" }}
          />

          {/* Processing Overlay - shows on top of camera feed */}
          {processing && !success && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
              <div className="bg-background/95 rounded-lg p-6 flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm font-medium text-foreground">Processing barcode...</p>
                <p className="text-xs text-muted-foreground">Looking up product</p>
              </div>
            </div>
          )}

          {/* Success Overlay - only shows when success is true, hides processing */}
          {success && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
              <div className="bg-background/95 rounded-lg p-6 flex flex-col items-center gap-3">
                <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
                <p className="text-sm font-medium text-foreground">{success}</p>
              </div>
            </div>
          )}

          {/* Scanning Guide Overlay - only shows when scanning and not processing/success */}
          {scanning && !processing && !success && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-5">
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
          {error && (
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p className="text-sm">{error}</p>
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
