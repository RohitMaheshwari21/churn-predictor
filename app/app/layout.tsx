import type { Metadata, Viewport } from "next";
import { Fraunces, Hanken_Grotesk } from "next/font/google";
import "./globals.css";
import { BottomNav, Sidebar } from "@/components/Nav";
import { ServiceWorker } from "@/components/ServiceWorker";

const display = Fraunces({ variable: "--font-display", subsets: ["latin"], axes: ["opsz"] });
const body = Hanken_Grotesk({ variable: "--font-body", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Churn Radar",
  description:
    "Spot telecom customers likely to leave, understand why, and test what could keep them. Explainable ML for phone and desktop.",
  applicationName: "Churn Radar",
  appleWebApp: { capable: true, title: "Churn Radar", statusBarStyle: "default" },
  icons: { icon: "/icon-192.png", apple: "/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3eee4" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1412" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body className="min-h-dvh antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-ink focus:px-4 focus:py-2 focus:text-paper"
        >
          Skip to content
        </a>
        <Sidebar />
        <div className="min-h-dvh md:pl-64">
          <main
            id="main"
            className="mx-auto w-full max-w-[560px] px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))] md:max-w-3xl md:px-8 md:pb-14 md:pt-10 lg:max-w-6xl"
          >
            {children}
          </main>
        </div>
        <BottomNav />
        <ServiceWorker />
      </body>
    </html>
  );
}
