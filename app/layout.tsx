import type { Metadata } from 'next';
import './globals.css';

const siteUrl = 'https://turing-machine-solo.maverick-lopez4343.chatgpt.site';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'Turing Machine · 单人解谜',
  description: '在浏览器中游玩图灵机离线挑战，询问验证器并推导唯一的三位密码。',
  openGraph: {
    title: 'Turing Machine · 单人解谜',
    description: '询问验证器，推导唯一密码。支持打印题库短代码与海量随机挑战。',
    type: 'website',
    images: [{ url: `${siteUrl}/og.png`, width: 1731, height: 909, alt: 'Turing Machine 单人解谜' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Turing Machine · 单人解谜',
    description: '询问验证器，推导唯一密码。',
    images: [`${siteUrl}/og.png`],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
