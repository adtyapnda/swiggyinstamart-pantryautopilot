export const metadata = {
  title: "Pantry Autopilot",
  description:
    "A WhatsApp agent that restocks your kitchen before you run out. Built on Swiggy MCP.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#fafaf7", color: "#1a1a1a" }}>
        {children}
      </body>
    </html>
  );
}
