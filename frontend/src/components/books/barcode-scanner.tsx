"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";

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

  const handleScan = useCallback(
    (decodedText: string) => {
      // EAN-13 ISBNs start with 978 or 979
      const cleaned = decodedText.replace(/[^0-9]/g, "");
      if (cleaned.length === 13 && (cleaned.startsWith("978") || cleaned.startsWith("979"))) {
        onScan(cleaned);
        if (!continuousMode) {
          // Stop scanner in single mode
          const scanner = html5QrCodeRef.current as { stop?: () => Promise<void> } | null;
          if (scanner && typeof scanner.stop === "function") {
            scanner.stop().catch(() => {});
          }
        }
      }
    },
    [onScan, continuousMode]
  );

  useEffect(() => {
    let mounted = true;

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
      const scanner = html5QrCodeRef.current as { stop?: () => Promise<void> } | null;
      if (scanner && typeof scanner.stop === "function") {
        scanner.stop().catch(() => {});
      }
    };
  }, [handleScan]);

  return (
    <div className="space-y-4">
      <div className="relative">
        {isStarting && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted rounded-lg z-10">
            <p className="text-sm text-muted-foreground">カメラを起動中...</p>
          </div>
        )}
        <div
          id="barcode-scanner-container"
          ref={scannerRef}
          className="w-full rounded-lg overflow-hidden"
          style={{ minHeight: 300 }}
        />
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <div className="flex justify-between items-center">
        <p className="text-xs text-muted-foreground">
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
