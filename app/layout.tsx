import type { Metadata } from "next";
import "./globals.css";
import {
  authorDescription,
  authorEmail,
  authorGithub,
  authorLinkedIn,
  authorName,
  siteDescription,
  siteKeywords,
  siteName,
  siteTitle,
  siteUrl,
} from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: siteTitle,
  applicationName: siteName,
  description: siteDescription,
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/logo.svg", type: "image/svg+xml" },
      { url: "/favicon.ico" },
    ],
  },
  keywords: [...siteKeywords],
  authors: [{ name: authorName, url: authorGithub }],
  creator: authorName,
  publisher: authorName,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: `${siteName} | ${authorName}`,
    description: siteDescription,
    url: "/",
    siteName,
    type: "website",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: siteName,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteName} | ${authorName}`,
    description: siteDescription,
    images: ["/twitter-image"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: "ZtwggqLQ7CnEbkbuK1EU6JKBApmqY33Ej8AYdba8rk0",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: siteName,
    operatingSystem: "Web",
    applicationCategory: "EducationalApplication",
    description: siteDescription,
    url: siteUrl,
    author: {
      "@type": "Person",
      name: authorName,
      email: authorEmail,
      description: authorDescription,
      sameAs: [authorGithub, authorLinkedIn],
    },
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  };

  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        <meta name="theme-color" content="#06b6d4" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="antialiased min-h-screen bg-background text-foreground selection:bg-cyan-500/30">
        {children}
      </body>
    </html>
  );
}
