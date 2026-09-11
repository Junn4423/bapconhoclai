import type { Metadata } from "next";
import { Be_Vietnam_Pro, Quicksand } from "next/font/google";
import "./globals.css";

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["vietnamese"],
  variable: "--font-body",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const quicksand = Quicksand({
  subsets: ["vietnamese"],
  variable: "--font-display",
  display: "swap",
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Bắp con học lái",
  description: "Góc học lý thuyết lái xe dịu dàng dành riêng cho Bắp iu.",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className={`${beVietnamPro.variable} ${quicksand.variable}`}>
        {children}
      </body>
    </html>
  );
}
