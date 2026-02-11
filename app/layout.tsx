import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Providers } from "@/components/Providers";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { DeviceInit } from "@/components/DeviceInit";
import { AccountLinkPrompt } from "@/components/AccountLinkPrompt";
import { TapAttribution } from "@/components/TapAttribution";
import "./globals.css";

export const metadata: Metadata = {
  title: "SwiftlyKart",
  description: "A simple and beautiful grocery list app",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SwiftlyKart",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "SwiftlyKart",
    title: "SwiftlyKart",
    description: "A simple and beautiful grocery list app",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ed7712" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1612" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" type="image/x-icon" href="/logo/favicon_io1/favicon.ico" />
        <link rel="icon" type="image/png" sizes="16x16" href="/logo/favicon_io1/favicon-16x16.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/logo/favicon_io1/favicon-32x32.png" />
        <link rel="apple-touch-icon" href="/logo/favicon_io1/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body className="antialiased min-h-screen bg-background text-foreground">
        <Providers>
          <DeviceInit />
          <ServiceWorkerRegister />
          <Suspense fallback={null}>
            <TapAttribution />
          </Suspense>
          <AccountLinkPrompt />
          {children}
        </Providers>
      </body>
    </html>
  );
}
