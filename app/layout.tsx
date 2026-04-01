import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Auto Leverage",
  description: "Leverage AutoResearch for everyone",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
        />
      </head>
      <body
        className={`${inter.className} min-h-screen bg-surface text-on-surface antialiased`}
      >
        {/* Geometric background — fixed, behind all page content */}
        <div className="geo-bg" aria-hidden="true">
          <div className="geo-glow" />
          <div className="geo-dot-grid" />
          <div className="geo-circle geo-circle-lg" />
          <div className="geo-circle geo-circle-sm" />
          <div className="geo-circle geo-circle-md" />
          <div className="geo-triangle" />
          <svg
            className="geo-hex"
            viewBox="0 0 100 115"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <polygon
              points="50,2 98,26 98,89 50,113 2,89 2,26"
              stroke="rgb(99,102,241)"
              strokeWidth="1.5"
              fill="none"
            />
          </svg>
        </div>

        {/* Page content — floats above the geo layer */}
        <div className="page-content">{children}</div>
        <Analytics />
      </body>
    </html>
  );
}
