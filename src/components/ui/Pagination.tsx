import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./Button";

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalRecords?: number;
  pageSize?: number;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalRecords,
  pageSize = 10,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const startRecord = (currentPage - 1) * pageSize + 1;
  const endRecord = totalRecords ? Math.min(currentPage * pageSize, totalRecords) : currentPage * pageSize;

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white border border-slate-200 rounded-xl mt-4">
      <div className="text-xs text-slate-500">
        {totalRecords ? (
          <span>
            Showing <strong className="font-semibold text-slate-700">{startRecord}</strong> to{" "}
            <strong className="font-semibold text-slate-700">{endRecord}</strong> of{" "}
            <strong className="font-semibold text-slate-700">{totalRecords}</strong> results
          </span>
        ) : (
          <span>
            Page <strong className="font-semibold text-slate-700">{currentPage}</strong> of{" "}
            <strong className="font-semibold text-slate-700">{totalPages}</strong>
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          aria-label="Previous Page"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Previous</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          aria-label="Next Page"
        >
          <span>Next</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
