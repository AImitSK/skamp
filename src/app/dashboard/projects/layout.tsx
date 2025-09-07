// src/app/dashboard/projects/layout.tsx
"use client";

export default function ProjectsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Layout-Logik wird jetzt in der Page-Komponente gehandhabt
  return <>{children}</>;
}