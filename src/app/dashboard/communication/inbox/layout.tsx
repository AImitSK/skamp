// src/app/dashboard/communication/inbox/layout.tsx
"use client";

import { useEffect } from "react";

export default function InboxLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // Verstecke die Sidebar für diese Seite
    const sidebar = document.querySelector('[data-slot="sidebar"]');
    const mainContent = document.querySelector('[data-slot="main"]');
    
    if (sidebar && mainContent) {
      sidebar.classList.add('hidden');
      mainContent.classList.remove('lg:pl-64', 'xl:pl-80');
      mainContent.classList.add('lg:pl-0');
    }
    
    // Cleanup beim Verlassen der Seite
    return () => {
      if (sidebar && mainContent) {
        sidebar.classList.remove('hidden');
        mainContent.classList.add('lg:pl-64', 'xl:pl-80');
        mainContent.classList.remove('lg:pl-0');
      }
    };
  }, []);
  
  return (
    <>
      {children}
    </>
  );
}