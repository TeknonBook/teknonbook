import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TeknonBook",
  description: "Fish farm accounting",
};

const navLinkStyle: React.CSSProperties = {
  padding: "8px 14px",
  borderRadius: 6,
  textDecoration: "none",
  color: "#0070f3",
  fontSize: 16,
  fontWeight: 500,
  border: "1px solid #d0d0d0",
  background: "white",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <nav
          style={{
            display: "flex",
            gap: 8,
            padding: "12px 16px",
            borderBottom: "1px solid #e5e5e5",
            background: "#fafafa",
            flexWrap: "wrap",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <Link href="/" style={navLinkStyle}>Home</Link>
          <Link href="/transactions" style={navLinkStyle}>Add Transaction</Link>
          <Link href="/accounts" style={navLinkStyle}>Accounts</Link>
          <Link href="/categories" style={navLinkStyle}>Categories</Link>
        </nav>
        {children}
      </body>
    </html>
  );
}
