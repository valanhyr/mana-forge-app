import { QRCodeSVG } from 'qrcode.react';

/** Renders locally, so the TOTP secret never leaves the browser. Anything but an authenticator link draws nothing. */
export function QrCode({ value, label }: { value: string; label: string }) {
  if (!value.startsWith('otpauth://')) return null;
  return <div role="img" aria-label={label} className="inline-block rounded-lg bg-white p-3">
    <QRCodeSVG value={value} size={176} level="M" />
  </div>;
}
