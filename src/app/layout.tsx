// src/app/layout.tsx
import { AuthContextProvider } from "@/context/AuthContext";
import "./globals.css";

export const metadata = {
  title: "skamp",
  description: "skamp Marketing Suite",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body>
        <AuthContextProvider>
          {children}
        </AuthContextProvider>
      </body>
    </html>
  );
}