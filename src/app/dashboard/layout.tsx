// src/app/dashboard/layout.tsx

import ProtectedRoute from "@/components/ProtectedRoute";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <section>
      <ProtectedRoute>
        {/* Navigationsleiste oder Seitenleiste für das Dashboard könnte hier sein */}
        <main>{children}</main>
      </ProtectedRoute>
    </section>
  );
}