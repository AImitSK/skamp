// src/components/projects/distribution/components/ListTableHeader.tsx
'use client';

interface Column {
  label: string;
  width: string;
}

interface ListTableHeaderProps {
  columns: Column[];
}

export default function ListTableHeader({ columns }: ListTableHeaderProps) {
  return (
    <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
      <div className="flex items-center">
        {columns.map((column, index) => (
          <div
            key={`${column.label}-${index}`}
            className={`${column.width} text-xs font-medium text-gray-500 uppercase tracking-wider`}
          >
            {column.label}
          </div>
        ))}
      </div>
    </div>
  );
}
