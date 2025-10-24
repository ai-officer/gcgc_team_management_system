'use client'

import * as React from 'react'
import { Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface TimePickerProps {
  value?: string // Format: "HH:mm"
  onChange: (time: string | undefined) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function TimePicker({
  value,
  onChange,
  placeholder = 'Select time',
  className,
  disabled
}: TimePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [hours, setHours] = React.useState<number>(0)
  const [minutes, setMinutes] = React.useState<number>(0)
  const [period, setPeriod] = React.useState<'AM' | 'PM'>('AM')

  // Parse initial value
  React.useEffect(() => {
    if (value) {
      const [h, m] = value.split(':').map(Number)
      const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h
      setHours(hour12)
      setMinutes(m)
      setPeriod(h >= 12 ? 'PM' : 'AM')
    } else {
      const now = new Date()
      const currentHour = now.getHours()
      const hour12 = currentHour === 0 ? 12 : currentHour > 12 ? currentHour - 12 : currentHour
      setHours(hour12)
      setMinutes(0)
      setPeriod(currentHour >= 12 ? 'PM' : 'AM')
    }
  }, [value])

  const handleApply = () => {
    const hour24 = period === 'PM'
      ? (hours === 12 ? 12 : hours + 12)
      : (hours === 12 ? 0 : hours)

    const timeString = `${hour24.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
    onChange(timeString)
    setIsOpen(false)
  }

  const handleClear = () => {
    onChange(undefined)
    setIsOpen(false)
  }

  const formatDisplayTime = (time: string) => {
    const [h, m] = time.split(':').map(Number)
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h
    const period = h >= 12 ? 'PM' : 'AM'
    return `${hour12}:${m.toString().padStart(2, '0')} ${period}`
  }

  const scrollToValue = (type: 'hours' | 'minutes', scrollRef: HTMLDivElement | null) => {
    if (scrollRef) {
      const targetValue = type === 'hours' ? hours : minutes
      const itemHeight = 40 // Height of each item
      const scrollPosition = (targetValue - (type === 'hours' ? 1 : 0)) * itemHeight
      scrollRef.scrollTop = scrollPosition - 80 // Center the selected item
    }
  }

  const hoursRef = React.useRef<HTMLDivElement>(null)
  const minutesRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        scrollToValue('hours', hoursRef.current)
        scrollToValue('minutes', minutesRef.current)
      }, 0)
    }
  }, [isOpen])

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen} modal={true}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full h-11 justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className
          )}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            if (!disabled) setIsOpen(!isOpen)
          }}
        >
          <Clock className="mr-2 h-4 w-4" />
          {value ? formatDisplayTime(value) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 z-[300]" align="start" sideOffset={4}>
        <div className="time-picker-container">
          <div className="time-picker-header">
            <div className="time-picker-display">
              <span className="time-picker-display-time">
                {hours.toString().padStart(2, '0')}:{minutes.toString().padStart(2, '0')}
              </span>
              <span className="time-picker-display-period">{period}</span>
            </div>
          </div>

          <div className="time-picker-body">
            {/* Hours */}
            <div className="time-picker-column">
              <div className="time-picker-column-label">Hour</div>
              <div className="time-picker-scroll" ref={hoursRef}>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((hour) => (
                  <button
                    key={hour}
                    type="button"
                    onClick={() => setHours(hour)}
                    className={cn(
                      'time-picker-item',
                      hours === hour && 'time-picker-item-selected'
                    )}
                  >
                    {hour.toString().padStart(2, '0')}
                  </button>
                ))}
              </div>
            </div>

            {/* Minutes */}
            <div className="time-picker-column">
              <div className="time-picker-column-label">Min</div>
              <div className="time-picker-scroll" ref={minutesRef}>
                {Array.from({ length: 60 }, (_, i) => i).map((minute) => (
                  <button
                    key={minute}
                    type="button"
                    onClick={() => setMinutes(minute)}
                    className={cn(
                      'time-picker-item',
                      minutes === minute && 'time-picker-item-selected'
                    )}
                  >
                    {minute.toString().padStart(2, '0')}
                  </button>
                ))}
              </div>
            </div>

            {/* Period */}
            <div className="time-picker-column time-picker-column-narrow">
              <div className="time-picker-column-label">Period</div>
              <div className="time-picker-period">
                <button
                  type="button"
                  onClick={() => setPeriod('AM')}
                  className={cn(
                    'time-picker-period-button',
                    period === 'AM' && 'time-picker-period-button-selected'
                  )}
                >
                  AM
                </button>
                <button
                  type="button"
                  onClick={() => setPeriod('PM')}
                  className={cn(
                    'time-picker-period-button',
                    period === 'PM' && 'time-picker-period-button-selected'
                  )}
                >
                  PM
                </button>
              </div>
            </div>
          </div>

          <div className="time-picker-footer">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="flex-1"
            >
              Clear
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleApply}
              className="flex-1"
            >
              Apply
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
