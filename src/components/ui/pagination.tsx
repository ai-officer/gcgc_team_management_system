'use client'

import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  disabled?: boolean
  showPageNumbers?: boolean
  className?: string
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  disabled = false,
  showPageNumbers = true,
  className
}: PaginationProps) {
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages && !disabled) {
      onPageChange(page)
    }
  }

  const renderPageNumbers = () => {
    if (!showPageNumbers || totalPages <= 1) return null

    const pages = []
    const maxVisiblePages = 7

    if (totalPages <= maxVisiblePages) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(
          <Button
            key={i}
            variant={currentPage === i ? "default" : "outline"}
            size="sm"
            onClick={() => handlePageChange(i)}
            disabled={disabled}
            className="w-10 h-10"
          >
            {i}
          </Button>
        )
      }
    } else {
      // Show first page
      pages.push(
        <Button
          key={1}
          variant={currentPage === 1 ? "default" : "outline"}
          size="sm"
          onClick={() => handlePageChange(1)}
          disabled={disabled}
          className="w-10 h-10"
        >
          1
        </Button>
      )

      // Show ellipsis if needed
      if (currentPage > 4) {
        pages.push(
          <Button
            key="ellipsis-start"
            variant="ghost"
            size="sm"
            disabled
            className="w-10 h-10"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        )
      }

      // Show pages around current page
      const start = Math.max(2, currentPage - 1)
      const end = Math.min(totalPages - 1, currentPage + 1)

      for (let i = start; i <= end; i++) {
        pages.push(
          <Button
            key={i}
            variant={currentPage === i ? "default" : "outline"}
            size="sm"
            onClick={() => handlePageChange(i)}
            disabled={disabled}
            className="w-10 h-10"
          >
            {i}
          </Button>
        )
      }

      // Show ellipsis if needed
      if (currentPage < totalPages - 3) {
        pages.push(
          <Button
            key="ellipsis-end"
            variant="ghost"
            size="sm"
            disabled
            className="w-10 h-10"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        )
      }

      // Show last page
      if (totalPages > 1) {
        pages.push(
          <Button
            key={totalPages}
            variant={currentPage === totalPages ? "default" : "outline"}
            size="sm"
            onClick={() => handlePageChange(totalPages)}
            disabled={disabled}
            className="w-10 h-10"
          >
            {totalPages}
          </Button>
        )
      }
    }

    return pages
  }

  return (
    <div className={cn("flex items-center gap-4", className)}>
      {/* Previous Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={currentPage === 1 || disabled || totalPages <= 1}
        className="flex items-center space-x-2"
      >
        <ChevronLeft className="h-4 w-4" />
        <span>Previous</span>
      </Button>

      {/* Page Numbers */}
      {showPageNumbers && totalPages > 1 && (
        <div className="flex items-center space-x-1">
          {renderPageNumbers()}
        </div>
      )}

      {/* Page Info */}
      <div className="text-sm text-gray-500">
        Page {currentPage} of {Math.max(totalPages, 1)}
      </div>

      {/* Next Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={currentPage === totalPages || disabled || totalPages <= 1}
        className="flex items-center space-x-2"
      >
        <span>Next</span>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}

interface PaginationInfoProps {
  currentPage: number
  pageSize: number
  totalItems: number
  className?: string
}

export function PaginationInfo({
  currentPage,
  pageSize,
  totalItems,
  className
}: PaginationInfoProps) {
  const start = Math.min((currentPage - 1) * pageSize + 1, totalItems)
  const end = Math.min(currentPage * pageSize, totalItems)

  return (
    <div className={cn("text-sm text-gray-500", className)}>
      Showing {start}-{end} of {totalItems} items
    </div>
  )
}