import type { Metadata, Viewport } from "next";
import { Josefin_Sans, Fraunces } from "next/font/google";
import ArtQuiz from "@/components/quiz/ArtQuiz";
import "./globals.css";

const josefinSans = Josefin_Sans({
  subsets: ["latin"],
  variable: "--font-avant-garde",
  weight: ["100", "200", "300", "400", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-cooper",
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Artify - Discover Art",
  description: "Discover art you love. Swipe through masterpieces, like, save, and see them in 3D.",
};

export const viewport: Viewport = {
  themeColor: "#F1E2D1",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
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
          href="https://fonts.googleapis.com/icon?family=Material+Icons"
          rel="stylesheet"
        />
      </head>
      <body className={`${josefinSans.variable} ${fraunces.variable}`}>
        {children}
        <ArtQuiz />
      </body>
    </html>
  );
}
