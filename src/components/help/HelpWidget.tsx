'use client'

import { useMemo, useState } from 'react'
import { HelpCircle, X, Search, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FAQ_CATEGORIES, type FaqEntry } from './faq-content'

/** Renders an answer string: blank lines = paragraphs, "- " lines = bullet steps. */
function AnswerBody({ text }: { text: string }) {
  const blocks = text.split('\n\n')
  return (
    <div className="space-y-2">
      {blocks.map((block, i) => {
        const lines = block.split('\n')
        const isList = lines.every((l) => l.trim().startsWith('- '))
        if (isList) {
          return (
            <ul key={i} className="list-disc space-y-1 pl-5">
              {lines.map((l, j) => (
                <li key={j}>{l.replace(/^\s*-\s/, '')}</li>
              ))}
            </ul>
          )
        }
        return <p key={i}>{block}</p>
      })}
    </div>
  )
}

export function HelpWidget() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  // Filter categories/entries by the search query (question + keywords).
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return FAQ_CATEGORIES
    return FAQ_CATEGORIES.map((cat) => ({
      ...cat,
      entries: cat.entries.filter((e: FaqEntry) => {
        const haystack = [e.question, e.answer, ...(e.keywords ?? [])]
          .join(' ')
          .toLowerCase()
        return haystack.includes(q)
      }),
    })).filter((cat) => cat.entries.length > 0)
  }, [query])

  const hasResults = filtered.length > 0

  return (
    <>
      {/* Floating panel */}
      {open && (
        <div
          role="dialog"
          aria-label="Help and FAQ"
          className="fixed bottom-24 right-4 z-50 flex w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl sm:right-6 sm:bottom-24"
          style={{ maxHeight: 'min(70vh, 520px)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between bg-primary px-4 py-3 text-primary-foreground">
            <div className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              <span className="font-semibold">Help &amp; FAQ</span>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close help"
              className="rounded-full p-1 transition-colors hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Search */}
          <div className="border-b border-gray-100 p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search the guides…"
                className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-primary focus:bg-white"
              />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-3 py-2 text-sm text-gray-700">
            {hasResults ? (
              filtered.map((cat) => (
                <div key={cat.id} className="mb-3">
                  <p className="px-1 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                    {cat.title}
                  </p>
                  <div className="space-y-1">
                    {cat.entries.map((entry) => {
                      const isOpen = expanded === entry.id
                      return (
                        <div
                          key={entry.id}
                          className="overflow-hidden rounded-lg border border-gray-100"
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setExpanded(isOpen ? null : entry.id)
                            }
                            aria-expanded={isOpen}
                            className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left font-medium text-gray-800 transition-colors hover:bg-gray-50"
                          >
                            <span>{entry.question}</span>
                            <ChevronDown
                              className={cn(
                                'h-4 w-4 shrink-0 text-gray-400 transition-transform',
                                isOpen && 'rotate-180'
                              )}
                            />
                          </button>
                          {isOpen && (
                            <div className="border-t border-gray-100 px-3 py-2 leading-relaxed text-gray-600">
                              <AnswerBody text={entry.answer} />
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))
            ) : (
              <p className="px-1 py-6 text-center text-gray-400">
                No guides match “{query}”.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Floating toggle button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close help' : 'Open help'}
        aria-expanded={open}
        className="fixed bottom-6 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95 sm:right-6"
      >
        {open ? <X className="h-6 w-6" /> : <HelpCircle className="h-7 w-7" />}
      </button>
    </>
  )
}
