/**
 * @file Table.jsx
 * Dense Institutional Financial Data Table Component with Sorting and Sticky Headers.
 */

import React from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

export const Table = ({
  columns = [],
  data = [],
  sortKey,
  sortDirection = 'asc',
  onSort,
  emptyMessage = 'No records found in active workspace.',
  className = '',
  keyExtractor = (item, idx) => item.id || item.key || idx
}) => {
  return (
    <div className={`w-full overflow-x-auto rounded-lg border border-slate-200 bg-white ${className}`}>
      <table className="w-full text-left border-collapse text-xs">
        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold tracking-wider sticky top-0 z-10">
          <tr>
            {columns.map((col) => {
              const isSortable = col.sortable && onSort;
              const isSorted = sortKey === col.key;

              return (
                <th
                  key={col.key}
                  onClick={() => isSortable && onSort(col.key)}
                  className={`px-4 py-3 whitespace-nowrap select-none ${
                    col.align === 'right'
                      ? 'text-right'
                      : col.align === 'center'
                      ? 'text-center'
                      : 'text-left'
                  } ${isSortable ? 'cursor-pointer hover:bg-slate-100' : ''}`}
                >
                  <div
                    className={`inline-flex items-center gap-1.5 ${
                      col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : 'justify-start'
                    }`}
                  >
                    <span>{col.header}</span>
                    {isSortable && (
                      <div className="flex flex-col text-slate-400">
                        {isSorted ? (
                          sortDirection === 'asc' ? (
                            <ChevronUp className="h-3.5 w-3.5 text-blue-600" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5 text-blue-600" />
                          )
                        ) : (
                          <div className="h-3.5 w-3.5 opacity-30">↕</div>
                        )}
                      </div>
                    )}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-slate-800">
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-slate-400 font-medium">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, idx) => (
              <tr key={keyExtractor(row, idx)} className="hover:bg-slate-50/80 transition-colors">
                {columns.map((col) => {
                  const val = row[col.key];
                  return (
                    <td
                      key={col.key}
                      className={`px-4 py-2.5 whitespace-nowrap ${
                        col.align === 'right'
                          ? 'text-right'
                          : col.align === 'center'
                          ? 'text-center'
                          : 'text-left'
                      } ${col.cellClassName || ''}`}
                    >
                      {col.render ? col.render(val, row, idx) : val ?? '—'}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default Table;
