import "./globals.css";
import React from "react";
import { Metadata } from "next";
import { Inter, Space_Grotesk } from 'next/font/google';
import ClientLayout from "../components/ClientLayout";
import { cn } from "../lib/utils";

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
});

export const metadata: Metadata = {
  title: "Riverside Medical Center | Riverside ERP",
  description: "Système complet de gestion hospitalière intelligent de Riverside Medical Center (Douala, Cameroun).",
  metadataBase: new URL('https://risimed.vercel.app/'),
  icons: {
    icon: "https://i.postimg.cc/jj9x2wr9/92953051-100850928268975-2573263542966812672-n.png",
    apple: "https://i.postimg.cc/jj9x2wr9/92953051-100850928268975-2573263542966812672-n.png",
  },
  openGraph: {
    title: "Riverside Medical Center | Riverside ERP",
    description: "Le futur de la gestion clinique à Douala. Optimisé par l'IA.",
    url: "https://risimed.vercel.app/",
    siteName: "Riverside ERP",
    images: [
      {
        url: "https://i.postimg.cc/jj9x2wr9/92953051-100850928268975-2573263542966812672-n.png",
        width: 800,
        height: 800,
        alt: "Riverside Medical Center Logo",
      },
    ],
    locale: "fr_FR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Riverside Medical Center | Riverside ERP",
    description: "Système complet de gestion hospitalière intelligent.",
    images: ["https://i.postimg.cc/jj9x2wr9/92953051-100850928268975-2573263542966812672-n.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={cn("h-full", inter.variable, spaceGrotesk.variable)}>
      <body className="h-full">
        <ClientLayout>
          {children}
        </ClientLayout>
      </body>
    </html>
  );
}
