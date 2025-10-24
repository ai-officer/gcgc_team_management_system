'use client'

import * as React from 'react'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface DatePickerProps {
  date?: Date
  onSelect: (date: Date | undefined) => void
  placeholder?: string
  disabled?: (date: Date) => boolean
  minDate?: Date
  maxDate?: Date
  className?: string
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

export function DatePicker({
  date,
  onSelect,
  placeholder = 'Select date',
  disabled,
  minDate,
  maxDate,
  className
}: DatePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [currentMonth, setCurrentMonth] = React.useState(date || new Date())

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay()
  }

  const isSameDay = (date1: Date, date2: Date) => {
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    )
  }

  const isToday = (date: Date) => {
    return isSameDay(date, new Date())
  }

  const isDisabled = (day: Date) => {
    if (disabled && disabled(day)) return true
    if (minDate && day < minDate) return true
    if (maxDate && day > maxDate) return true
    return false
  }

  const handlePreviousMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1))
  }

  const handleNextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1))
  }

  const handleDateSelect = (day: number) => {
    const selectedDate = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      day
    )

    if (!isDisabled(selectedDate)) {
      onSelect(selectedDate)
      setIsOpen(false)
    }
  }

  const handleClear = () => {
    onSelect(undefined)
    setIsOpen(false)
  }

  const renderCalendar = () => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const daysInMonth = getDaysInMonth(year, month)
    const firstDay = getFirstDayOfMonth(year, month)

    const days = []

    // Previous month's days
    const prevMonthDays = getDaysInMonth(year, month - 1)
    for (let i = firstDay - 1; i >= 0; i--) {
      const day = prevMonthDays - i
      const dayDate = new Date(year, month - 1, day)
      days.push(
        <button
          key={`prev-${day}`}
          type="button"
          className="calendar-day calendar-day-outside"
          disabled
        >
          {day}
        </button>
      )
    }

    // Current month's days
    for (let day = 1; day <= daysInMonth; day++) {
      const dayDate = new Date(year, month, day)
      const selected = date && isSameDay(dayDate, date)
      const today = isToday(dayDate)
      const dayDisabled = isDisabled(dayDate)

      days.push(
        <button
          key={`current-${day}`}
          type="button"
          onClick={() => handleDateSelect(day)}
          disabled={dayDisabled}
          className={cn(
            'calendar-day',
            selected && 'calendar-day-selected',
            today && !selected && 'calendar-day-today',
            dayDisabled && 'calendar-day-disabled'
          )}
        >
          {day}
        </button>
      )
    }

    // Next month's days to fill the grid
    const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7
    const remainingCells = totalCells - days.length
    for (let day = 1; day <= remainingCells; day++) {
      days.push(
        <button
          key={`next-${day}`}
          type="button"
          className="calendar-day calendar-day-outside"
          disabled
        >
          {day}
        </button>
      )
    }

    return days
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    }).format(date)
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen} modal={true}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "w-full h-11 justify-start text-left font-normal",
            !date && "text-muted-foreground",
            className
          )}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setIsOpen(!isOpen)
          }}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? formatDate(date) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 z-[300]" align="start" sideOffset={4}>
        <div className="calendar-container">
          {/* Header */}
          <div className="calendar-header">
            <button
              type="button"
              onClick={handlePreviousMonth}
              className="calendar-nav-button"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <div className="calendar-title">
              {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="calendar-nav-button"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="calendar-weekdays">
            {DAYS.map(day => (
              <div key={day} className="calendar-weekday">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="calendar-grid">
            {renderCalendar()}
          </div>

          {/* Footer */}
          {date && (
            <div className="calendar-footer">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="w-full"
              >
                Clear date
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
