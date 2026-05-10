import type { Metadata } from "next";
import { Instrument_Sans, JetBrains_Mono, Geist } from "next/font/google";
// import { ClerkProvider } from "@clerk/nextjs"; // TEMP: desactivado hasta configurar keys
import { QueryProvider } from "@/providers/query-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";
import { cn } from "@/lib/utils";

const instrumentSans = Instrument_Sans({
  variable: "--font-heading",
  subsets: ["latin"],
});

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Marketplace App",
  description: "Venta de Perfumes",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // TEMP: <ClerkProvider> desactivado hasta configurar keys
    <html
      lang="es"
      className={cn("h-full", "antialiased", instrumentSans.variable, jetbrainsMono.variable, "font-sans", geist.variable)}
    >
      <body className="flex min-h-full flex-col">
        <QueryProvider>
          <TooltipProvider>
            {children}
            <Toaster />
          </TooltipProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
