import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Seva Yagna 2026 | Attendance Portal",
  description: "Xetra-wise Yuvak attendance and live Mandal reporting",
  robots: { index: false, follow: false },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
