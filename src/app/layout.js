export const metadata = {
  title: "CyberHome ChatUI",
  description: "AI聊天界面",
}

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>
        <main>{children}</main>
      </body>
    </html>
  );
}
