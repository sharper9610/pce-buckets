"use client";

import {
  Table as UITable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Column {
  key: string;
  header: string | React.ReactNode;
  render?: (value: any, row: any) => React.ReactNode;
}

interface TableProps {
  columns: Column[];
  data: any[];
  onRowClick?: (row: any) => void;
  expandable?: boolean;
  renderExpanded?: (row: any) => React.ReactNode;
}

export function Table({ columns, data, onRowClick, expandable, renderExpanded }: TableProps) {
  const [expandedRows, setExpandedRows] = React.useState<Set<number>>(new Set());

  const toggleRow = (index: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedRows(newExpanded);
  };

  return (
    <div className="rounded-md border">
      <UITable>
        <TableHeader>
          <TableRow>
            {expandable && <TableHead className="w-12"></TableHead>}
            {columns.map((column) => (
              <TableHead key={column.key}>{column.header}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length + (expandable ? 1 : 0)} className="text-center text-muted-foreground">
                No data available
              </TableCell>
            </TableRow>
          ) : (
            data.map((row, index) => (
              <React.Fragment key={index}>
                <TableRow
                  className={onRowClick ? "cursor-pointer hover:bg-muted/50" : ""}
                  onClick={() => onRowClick?.(row)}
                >
                  {expandable && (
                    <TableCell>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleRow(index);
                        }}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        {expandedRows.has(index) ? "▼" : "▶"}
                      </button>
                    </TableCell>
                  )}
                  {columns.map((column) => (
                    <TableCell key={column.key}>
                      {column.render
                        ? column.render(row[column.key], row)
                        : row[column.key]}
                    </TableCell>
                  ))}
                </TableRow>
                {expandable && expandedRows.has(index) && renderExpanded && (
                  <TableRow>
                    <TableCell colSpan={columns.length + 1} className="bg-muted/30">
                      {renderExpanded(row)}
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            ))
          )}
        </TableBody>
      </UITable>
    </div>
  );
}

import React from \"react\";\n"}]