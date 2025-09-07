// src/app/dashboard/projects/layout.tsx
"use client";

import { useEffect } from "react";

export default function ProjectsLayout({
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
      
      // Entferne auch die padding/margin Klassen vom main content
      mainContent.classList.remove('p-4', 'sm:p-6', 'lg:p-8');
      mainContent.classList.add('p-0');
    }
    
    // Cleanup beim Verlassen der Seite
    return () => {
      if (sidebar && mainContent) {
        sidebar.classList.remove('hidden');
        mainContent.classList.add('lg:pl-64', 'xl:pl-80');
        mainContent.classList.remove('lg:pl-0');
        
        // Stelle padding/margin wieder her
        mainContent.classList.add('p-4', 'sm:p-6', 'lg:p-8');
        mainContent.classList.remove('p-0');
      }
    };
  }, []);
  
  return (
    <div className="absolute inset-0 top-14">
      {children}
    </div>
  );
}