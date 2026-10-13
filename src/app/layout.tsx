import type { Metadata, Viewport } from "next";
import PWARegister from "@/components/PWARegister";
import InstallPrompt from "@/components/InstallPrompt";
import "./globals.css";

export const metadata: Metadata = {
  title: "PWA Blox | Panel de Administración",
  description:
    "Panel administrativo PWA para gestionar el catálogo de Page Blox. Pedidos, productos y métricas en tiempo real.",
  applicationName: "PWA Blox Admin",
  manifest: "/admin/manifest.json",
  appleWebApp: {
    capable: true,
    title: "PWA Blox Admin",
    statusBarStyle: "black-translucent",
    startupImage: "/admin/icons/apple-touch-icon.png",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/admin/icons/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/admin/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/admin/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/admin/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  robots: {
    index: false,
    follow: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#ef4444",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="icon" href="/admin/icons/favicon-32x32.png" sizes="32x32" type="image/png" />
        <link rel="apple-touch-icon" href="/admin/icons/apple-touch-icon.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="PWA Blox Admin" />
        <meta name="application-name" content="PWA Blox Admin" />
        <meta name="theme-color" content="#ef4444" />
        <meta name="msapplication-TileColor" content="#ef4444" />
        <meta name="msapplication-tap-highlight" content="no" />
      </head>
      <body>
        {children}
        <PWARegister />
        <InstallPrompt />
      </body>
    </html>
  );
}
