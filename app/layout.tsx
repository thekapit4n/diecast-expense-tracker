import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";
import { Toaster } from "@/components/ui/sonner";
import { AdminLayout } from "@/components/layout/admin-layout";
import { AuthProvider } from "@/lib/auth/auth-context";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Diecast Expense Tracker",
  description: "Admin portal for tracking diecast collection expenses",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <AdminLayout>
            {children}
          </AdminLayout>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
