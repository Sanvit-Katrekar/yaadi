import type { Metadata } from "next";
import { ConfirmDialogProvider } from "@/components/ConfirmDialog";

import "./globals.css";

export const metadata: Metadata = {
  title: "Yaadi",
  description: "Shared checklist hub",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
      <ConfirmDialogProvider />
    </html>
  );
}
