import React, { useCallback, useRef, useState } from "react";
import { TxnPinModal } from "../components/TxnPinModal";

export function useTxnPin() {
  const [visible, setVisible] = useState(false);
  const resolver = useRef<((pin: string) => void) | null>(null);
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

  const onVerified = useCallback((pin: string) => {
    setVisible(false);
    resolver.current?.(pin);
    resolver.current = null;
    rejecter.current = null;
  }, []);

  const TxnPinPrompt = useCallback(
    () => <TxnPinModal visible={visible} onClose={close} onVerified={onVerified} />,
    [visible, close, onVerified],
  );

  return { promptPin, TxnPinPrompt };
}
