// src/app/share/layout.tsx
export default function ShareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Öffentliche Share-Seiten ohne Dashboard-Navigation */}
      {children}
    </div>
  );
}