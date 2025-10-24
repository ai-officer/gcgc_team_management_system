'use client'

import * as React from 'react'
import { Check, X, Search, ChevronDown, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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

interface SearchableMultiSelectProps {
  options: SelectOption[]
  selected: SelectOption[]
  onSelect: (option: SelectOption) => void
  onRemove: (id: string) => void
  onClear?: () => void
  placeholder?: string
  emptyText?: string
  className?: string
  disabled?: boolean
  maxHeight?: string
}

export function SearchableMultiSelect({
  options,
  selected,
  onSelect,
  onRemove,
  onClear,
  placeholder = 'Select members...',
  emptyText = 'No members found',
  className,
  disabled = false,
  maxHeight = '300px'
}: SearchableMultiSelectProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState('')
  const searchInputRef = React.useRef<HTMLInputElement>(null)

  // Filter options based on search query and exclude already selected
  const filteredOptions = React.useMemo(() => {
    const query = searchQuery.toLowerCase().trim()

    return options.filter(option => {
      // Exclude already selected
      if (selected.some(s => s.id === option.id)) return false

      // Filter by search query
      if (!query) return true

      const nameMatch = option.name?.toLowerCase().includes(query)
      const emailMatch = option.email.toLowerCase().includes(query)
      const roleMatch = option.role?.toLowerCase().includes(query)

      return nameMatch || emailMatch || roleMatch
    })
  }, [options, selected, searchQuery])

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

  const handleSelect = (option: SelectOption) => {
    onSelect(option)
    setSearchQuery('')
  }

  const handleClearAll = () => {
    if (onClear) {
      onClear()
    }
    setIsOpen(false)
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
    <div className={cn('space-y-3', className)}>
      {/* Popover Trigger */}
      <Popover open={isOpen} onOpenChange={setIsOpen} modal={true}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn(
              'w-full h-11 justify-between text-left font-normal',
              !selected.length && 'text-muted-foreground'
            )}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              if (!disabled) setIsOpen(!isOpen)
            }}
          >
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>
                {selected.length > 0
                  ? `${selected.length} selected`
                  : placeholder}
              </span>
            </div>
            <ChevronDown className={cn(
              "h-4 w-4 transition-transform duration-200",
              isOpen && "transform rotate-180"
            )} />
          </Button>
        </PopoverTrigger>

        <PopoverContent
          className="w-[400px] p-0 z-[300]"
          align="start"
          sideOffset={4}
        >
          <div className="multi-select-container">
            {/* Search Header */}
            <div className="multi-select-header">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search by name, email, or role..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-10 border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>

              {selected.length > 0 && (
                <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-t">
                  <span className="text-sm text-muted-foreground">
                    {selected.length} member{selected.length !== 1 ? 's' : ''} selected
                  </span>
                  {onClear && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleClearAll}
                      className="h-7 text-xs"
                    >
                      Clear all
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Options List */}
            <ScrollArea className="multi-select-scroll" style={{ maxHeight }}>
              {filteredOptions.length > 0 ? (
                <div className="p-1">
                  {filteredOptions.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => handleSelect(option)}
                      className="multi-select-option"
                    >
                      <div className="flex items-center gap-3 flex-1">
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

                        {option.role && (
                          <Badge variant="secondary" className="text-xs shrink-0">
                            {option.role}
                          </Badge>
                        )}
                      </div>

                      <div className="multi-select-checkbox">
                        <Check className="h-4 w-4" />
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="multi-select-empty">
                  <Users className="h-8 w-8 text-muted-foreground/50 mb-2" />
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
            </ScrollArea>
          </div>
        </PopoverContent>
      </Popover>

      {/* Selected Items Display */}
      {selected.length > 0 && (
        <div className="multi-select-selected">
          <div className="flex flex-wrap gap-2">
            {selected.map((option) => (
              <Badge
                key={option.id}
                variant="secondary"
                className="multi-select-badge"
              >
                <Avatar className="h-5 w-5 mr-1.5">
                  <AvatarImage src={option.image} />
                  <AvatarFallback className="bg-gradient-to-br from-primary/10 to-primary/20 text-primary text-[10px] font-semibold">
                    {getInitials(option)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">
                  {option.name || option.email}
                </span>
                <button
                  type="button"
                  onClick={() => onRemove(option.id)}
                  className="ml-1.5 hover:bg-destructive/20 rounded-sm p-0.5 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
