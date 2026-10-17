import React from 'react';

interface TableSkeletonProps {
  columns?: number;
  rows?: number;
}

const TableSkeleton: React.FC<TableSkeletonProps> = ({ columns = 5, rows = 5 }) => {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 animate-pulse">
      <table className="w-full whitespace-nowrap text-left text-sm text-gray-500 dark:text-gray-400">
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            {Array.from({ length: columns }).map((_, index) => (
              <th key={index} className="px-6 py-4">
                <div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-700"></div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
              {Array.from({ length: columns }).map((_, colIndex) => (
                <td key={colIndex} className="px-6 py-4">
                  <div className={`h-4 rounded bg-gray-200 dark:bg-gray-700 ${colIndex === 0 ? 'w-8' : colIndex === columns - 1 ? 'w-16 ml-auto' : 'w-full max-w-[150px]'}`}></div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TableSkeleton;
