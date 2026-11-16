import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Geist, JetBrains_Mono } from "next/font/google";
import Shell from "@/components/Shell";
import "./globals.css";

const display = Bricolage_Grotesque({ variable: "--font-display", subsets: ["latin"] });
const body = Geist({ variable: "--font-body", subsets: ["latin"] });
const code = JetBrains_Mono({ variable: "--font-code", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Ascent",
  description: "An interactive, timeline-driven trail through DSA, system design and object-oriented design for Google SWE interviews.",
};
export const viewport: Viewport = { themeColor: "#090a0f", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${code.variable} antialiased`}>
      <body className="min-h-dvh">
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
