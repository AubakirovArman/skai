import type { Metadata } from "next";
import "./globals.css";
import { Navigation } from "@/components/navigation";
import { Providers } from "@/components/providers";
import { ConditionalNavigation } from "@/components/conditional-navigation";

export const metadata: Metadata = {
  title: "SK AI — независимый (цифровой) член СД",
  description: "SK AI — система искусственного интеллекта для поддержки принятия решений советом директоров",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className="antialiased">
        <Providers>
          <ConditionalNavigation />
          <main className="min-h-screen bg-gray-50">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
