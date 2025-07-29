// src/app/dashboard/communication/inbox/layout.tsx
export default function InboxLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 overflow-hidden">
      {children}
    </div>
  );
}