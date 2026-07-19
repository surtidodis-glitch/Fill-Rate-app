import "./globals.css";

export const metadata = {
  title: "Fill Rate — Dashboard",
  description: "Seguimiento de entregas, fill rate y cumplimiento",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body style={{ backgroundColor: "#0A0E1A", margin: 0 }}>{children}</body>
    </html>
  );
}
