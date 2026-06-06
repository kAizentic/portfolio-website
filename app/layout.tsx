import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Michael Ryan McConnell — AI Product Marketing Consultant",
  description:
    "AI product marketing consultant helping B2B technology companies with positioning, go-to-market strategy, and digital experiences for AI, cloud, and technical products.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`} style={{ backgroundColor: '#050507' }}>
      <body className="font-sans antialiased bg-[#050507]">{children}</body>
    </html>
  );
}
