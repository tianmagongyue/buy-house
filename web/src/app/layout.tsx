import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "上海 2021 限售楼盘地图",
  description: "查看 2021 年上海触发限售楼盘位置与二手房挂牌价",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
