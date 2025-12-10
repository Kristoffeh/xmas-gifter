import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { LanguageProvider } from "@/lib/language-context";

export const metadata: Metadata = {
  title: "Christmas Gifter",
  description: "Keep track of your Christmas gift purchases",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <LanguageProvider>{children}</LanguageProvider>
        </Providers>
      </body>
    </html>
  );
}

