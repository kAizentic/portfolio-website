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

/**
 * Applies the persisted theme before first paint so a stored "light"
 * preference never flashes dark (and vice versa). Must stay inline and tiny;
 * runs before any framework code.
 */
const themeInitScript = `(function(){try{if(localStorage.getItem("theme")==="light"){document.documentElement.dataset.theme="light";}}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${spaceGrotesk.variable}`}
      style={{ backgroundColor: "var(--background)" }}
      suppressHydrationWarning
    >
      <body className="font-sans antialiased bg-background">
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        {children}
      </body>
    </html>
  );
}
