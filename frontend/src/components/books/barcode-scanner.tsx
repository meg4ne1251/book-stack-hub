"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

const SCAN_DEBOUNCE_MS = 3000;

interface BarcodeScannerProps {
  onScan: (isbn: string) => void;
  onClose: () => void;
  continuousMode: boolean;
}

export function BarcodeScanner({
  onScan,
  onClose,
  continuousMode,
}: BarcodeScannerProps) {
  const scannerRef = useRef<HTMLDivElement>(null);
  const html5QrCodeRef = useRef<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(true);
  const lastScannedRef = useRef<string>("");
  const lastScanTimeRef = useRef<number>(0);
  const isStoppedRef = useRef(false);

  // Use refs to avoid restarting the scanner when props change
  const onScanRef = useRef(onScan);
  const continuousModeRef = useRef(continuousMode);
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);
  useEffect(() => {
    continuousModeRef.current = continuousMode;
  }, [continuousMode]);

  useEffect(() => {
    let mounted = true;

    isStoppedRef.current = false;

    const handleScan = (decodedText: string) => {
      // EAN-13 ISBNs start with 978 or 979
      const cleaned = decodedText.replace(/[^0-9]/g, "");
      if (cleaned.length === 13 && (cleaned.startsWith("978") || cleaned.startsWith("979"))) {
        const now = Date.now();
        // Debounce: ignore same ISBN within 3 seconds
        if (cleaned === lastScannedRef.current && now - lastScanTimeRef.current < SCAN_DEBOUNCE_MS) {
          return;
        }
        lastScannedRef.current = cleaned;
        lastScanTimeRef.current = now;

        onScanRef.current(cleaned);
        if (!continuousModeRef.current && !isStoppedRef.current) {
          // Stop scanner in single mode
          isStoppedRef.current = true;
          const scanner = html5QrCodeRef.current as { stop?: () => Promise<void> } | null;
          if (scanner && typeof scanner.stop === "function") {
            try {
              scanner.stop().catch(() => {});
            } catch {
              // Scanner already stopped
            }
          }
        }
      }
    };

    const startScanner = async () => {
      try {
        // Dynamic import for html5-qrcode (client-side only)
        const { Html5Qrcode } = await import("html5-qrcode");

        if (!mounted || !scannerRef.current) return;

        const scanner = new Html5Qrcode("barcode-scanner-container");
        html5QrCodeRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 280, height: 150 },
          },
          (decodedText: string) => {
            handleScan(decodedText);
          },
          () => {
            // Scan failure (no barcode detected) - ignore
          }
        );

        if (mounted) {
          setIsStarting(false);
        }
      } catch (err) {
        if (mounted) {
          setError(
            err instanceof Error
              ? err.message
              : "カメラの起動に失敗しました。カメラの権限を確認してください。"
          );
          setIsStarting(false);
        }
      }
    };

    startScanner();

    return () => {
      mounted = false;
      if (!isStoppedRef.current) {
        isStoppedRef.current = true;
        const scanner = html5QrCodeRef.current as { stop?: () => Promise<void> } | null;
        if (scanner && typeof scanner.stop === "function") {
          try {
            scanner.stop().catch(() => {});
          } catch {
            // Scanner already stopped
          }
        }
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      <div className="relative">
        {isStarting && (
          <div className="absolute inset-0 flex items-center justify-center bg-stone-100 rounded z-10">
            <p className="text-sm text-stone-400">カメラを起動中...</p>
          </div>
        )}
        <div
          id="barcode-scanner-container"
          ref={scannerRef}
          className="w-full rounded overflow-hidden"
          style={{ minHeight: 300 }}
        />
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      <div className="flex justify-between items-center">
        <p className="text-xs text-stone-400">
          {continuousMode
            ? "連続スキャンモード: バーコードを検出すると自動で登録します"
            : "書籍のバーコード（ISBN）をカメラに映してください"}
        </p>
        <Button variant="outline" size="sm" onClick={onClose}>
          閉じる
        </Button>
      </div>
    </div>
  );
}
