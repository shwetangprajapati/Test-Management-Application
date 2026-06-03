import type { Metadata } from "next";
import { Inter, Roboto } from "next/font/google";
import { ToastViewport } from "./components/toast-viewport";
import "./globals.css";

// Inter for the UI, Roboto for the breadcrumb trail (matches the design).
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "PrepRoute Test Creation",
  description: "Create a chapter wise test in PrepRoute.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${roboto.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        {children}
        <ToastViewport />
      </body>
    </html>
  );
}
