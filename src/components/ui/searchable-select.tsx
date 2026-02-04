'use client'

import * as React from 'react'
import { Check, Search, ChevronDown, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'

export interface SelectOption {
  id: string
  name?: string
  email: string
  image?: string
  role?: string
}

interface SearchableSelectProps {
  options: SelectOption[]
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  emptyText?: string
  allLabel?: string
  className?: string
  disabled?: boolean
  maxDisplayed?: number
}

export function SearchableSelect({
  options,
  value,
  onValueChange,
  placeholder = 'Select user...',
  emptyText = 'No users found',
  allLabel = 'All users',
  className,
  disabled = false,
  maxDisplayed = 10
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState('')
  const searchInputRef = React.useRef<HTMLInputElement>(null)

  // Find selected option
  const selectedOption = React.useMemo(() => {
    if (!value) return null
    return options.find(opt => opt.id === value)
  }, [options, value])

  // Filter options based on search query and limit to maxDisplayed
  const filteredOptions = React.useMemo(() => {
    const query = searchQuery.toLowerCase().trim()

    let filtered = options
    if (query) {
      filtered = options.filter(option => {
        const nameMatch = option.name?.toLowerCase().includes(query)
        const emailMatch = option.email.toLowerCase().includes(query)
        return nameMatch || emailMatch
      })
    }

    // Limit to maxDisplayed
    return filtered.slice(0, maxDisplayed)
  }, [options, searchQuery, maxDisplayed])

  // Total matching count for display
  const totalMatching = React.useMemo(() => {
    const query = searchQuery.toLowerCase().trim()
    if (!query) return options.length

    return options.filter(option => {
      const nameMatch = option.name?.toLowerCase().includes(query)
      const emailMatch = option.email.toLowerCase().includes(query)
      return nameMatch || emailMatch
    }).length
  }, [options, searchQuery])

  // Focus search input when popover opens
  React.useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 0)
    }
  }, [isOpen])

  // Clear search when popover closes
  React.useEffect(() => {
    if (!isOpen) {
      setSearchQuery('')
    }
  }, [isOpen])

  const handleSelect = (optionId: string) => {
    onValueChange(optionId)
    setIsOpen(false)
    setSearchQuery('')
  }

  const getInitials = (option: SelectOption) => {
    if (option.name) {
      return option.name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    }
    return option.email[0].toUpperCase()
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen} modal={true}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            'w-[200px] h-10 justify-between text-left font-normal',
            !value && 'text-muted-foreground',
            className
          )}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            if (!disabled) setIsOpen(!isOpen)
          }}
        >
          <div className="flex items-center gap-2 truncate">
            {selectedOption ? (
              <>
                <Avatar className="h-5 w-5">
                  <AvatarImage src={selectedOption.image} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {getInitials(selectedOption)}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate">{selectedOption.name || selectedOption.email}</span>
              </>
            ) : (
              <>
                <User className="h-4 w-4" />
                <span>{placeholder}</span>
              </>
            )}
          </div>
          <ChevronDown className={cn(
            "h-4 w-4 shrink-0 transition-transform duration-200",
            isOpen && "transform rotate-180"
          )} />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[280px] p-0 z-[200]"
        align="start"
        sideOffset={4}
      >
        {/* Search Header */}
        <div className="border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none"
            />
          </div>
        </div>

        {/* Options List */}
        <ScrollArea className="max-h-[300px]">
          <div className="p-1">
            {/* All Users Option */}
            <button
              type="button"
              onClick={() => handleSelect('')}
              className={cn(
                "flex items-center gap-3 w-full px-3 py-2 rounded-md text-left transition-colors",
                "hover:bg-muted",
                !value && "bg-muted"
              )}
            >
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                <User className="h-4 w-4 text-muted-foreground" />
              </div>
              <span className="font-medium text-sm">{allLabel}</span>
              {!value && (
                <Check className="h-4 w-4 ml-auto text-primary" />
              )}
            </button>

            {/* Divider */}
            <div className="border-t my-1" />

            {/* User Options */}
            {filteredOptions.length > 0 ? (
              <>
                {filteredOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => handleSelect(option.id)}
                    className={cn(
                      "flex items-center gap-3 w-full px-3 py-2 rounded-md text-left transition-colors",
                      "hover:bg-muted",
                      value === option.id && "bg-muted"
                    )}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={option.image} />
                      <AvatarFallback className="bg-gradient-to-br from-primary/10 to-primary/20 text-primary text-xs font-semibold">
                        {getInitials(option)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex flex-col items-start flex-1 min-w-0">
                      <span className="font-medium text-sm truncate w-full">
                        {option.name || 'No name'}
                      </span>
                      <span className="text-xs text-muted-foreground truncate w-full">
                        {option.email}
                      </span>
                    </div>

                    {value === option.id && (
                      <Check className="h-4 w-4 shrink-0 text-primary" />
                    )}
                  </button>
                ))}

                {/* Show more indicator */}
                {totalMatching > maxDisplayed && (
                  <div className="px-3 py-2 text-xs text-muted-foreground text-center border-t mt-1">
                    Showing {maxDisplayed} of {totalMatching} users. Type to search more.
                  </div>
                )}
              </>
            ) : (
              <div className="py-6 text-center">
                <User className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                <p className="text-sm font-medium text-muted-foreground">
                  {searchQuery ? 'No matches found' : emptyText}
                </p>
                {searchQuery && (
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    Try a different search term
                  </p>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
