import type { Metadata } from "next";
import { Libre_Franklin } from "next/font/google";
import "./globals.css";

const libreFranklin = Libre_Franklin({
  weight: "800",
  subsets: ["latin"],
  variable: "--font-libre-franklin",
});

export const metadata: Metadata = {
  title: "Swofty's Pips",
  description: "The only 100% visually faithful recreation of the Pips game by The New York Times!",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", type: "image/x-icon" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Swofty's Pips",
    description: "The only 100% visually faithful recreation of the Pips game by The New York Times!",
    images: [{ url: "/og-image.png" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Swofty's Pips",
    description: "The only 100% visually faithful recreation of the Pips game by The New York Times!",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={libreFranklin.variable}>
        {children}
      </body>
    </html>
  );
}
