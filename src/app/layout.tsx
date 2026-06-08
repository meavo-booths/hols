import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vacation Tracker",
  description: "Company vacation and time-off tracker",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
