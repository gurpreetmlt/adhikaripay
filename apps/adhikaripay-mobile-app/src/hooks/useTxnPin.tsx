import React, { useCallback, useRef, useState } from "react";
import { TxnPinModal } from "../components/TxnPinModal";

export function useTxnPin() {
  const [visible, setVisible] = useState(false);
  const resolver = useRef<((txnAuth: string) => void) | null>(null);
  const rejecter = useRef<(() => void) | null>(null);

  const promptPin = useCallback(
    () =>
      new Promise<string>((resolve, reject) => {
        resolver.current = resolve;
        rejecter.current = reject;
        setVisible(true);
      }),
    [],
  );

  const close = useCallback(() => {
    setVisible(false);
    rejecter.current?.();
    resolver.current = null;
    rejecter.current = null;
  }, []);

  const onVerified = useCallback((txnAuth: string) => {
    setVisible(false);
    resolver.current?.(txnAuth);
    resolver.current = null;
    rejecter.current = null;
  }, []);

  const TxnPinPrompt = useCallback(
    () => <TxnPinModal visible={visible} onClose={close} onVerified={onVerified} />,
    [visible, close, onVerified],
  );

  return { promptPin, TxnPinPrompt };
}

/** Stable idempotency key for a single in-flight action (survives double-tap). */
export function useIdempotencyKey(prefix: string) {
  const ref = useRef<string | null>(null);
  return {
    peek: () => {
      if (!ref.current) {
        const rand =
          typeof globalThis.crypto?.randomUUID === "function"
            ? globalThis.crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
        ref.current = `${prefix}-${rand}`;
      }
      return ref.current;
    },
    clear: () => {
      ref.current = null;
    },
  };
}
