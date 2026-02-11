# Professional Productivity Design System

## Design Philosophy
Creating a modern, professional productivity tool that makes users feel efficient, focused, and in control.

## Color System

### Primary Palette (Professional Blues & Grays)
```css
--slate-50: #f8fafc    /* Backgrounds */
--slate-100: #f1f5f9   /* Subtle backgrounds */
--slate-200: #e2e8f0   /* Borders */
--slate-300: #cbd5e1   /* Disabled states */
--slate-700: #334155   /* Secondary text */
--slate-900: #0f172a   /* Primary text */

--blue-50: #eff6ff     /* Light blue bg */
--blue-500: #3b82f6    /* Primary actions */
--blue-600: #2563eb    /* Hover states */
--blue-700: #1d4ed8    /* Active states */
```

### Semantic Colors (Muted for Professionalism)
```css
--emerald-50: #ecfdf5  /* Success bg */
--emerald-600: #059669 /* Success */
--amber-50: #fffbeb    /* Warning bg */
--amber-600: #d97706   /* Warning */
--red-50: #fef2f2      /* Error bg */
--red-600: #dc2626     /* Error */
--purple-50: #faf5ff   /* Info bg */
--purple-600: #9333ea  /* Info */
```

## Typography

### Font Scale (Productive Hierarchy)
```css
--text-xs: 0.75rem     /* 12px - Labels, timestamps */
--text-sm: 0.875rem    /* 14px - Body, descriptions */
--text-base: 1rem      /* 16px - Body text */
--text-lg: 1.125rem    /* 18px - Subheadings */
--text-xl: 1.25rem     /* 20px - Card titles */
--text-2xl: 1.5rem     /* 24px - Section headers */
--text-3xl: 1.875rem   /* 30px - Page titles */
```

### Font Weights
```css
--font-normal: 400     /* Body text */
--font-medium: 500     /* Emphasis */
--font-semibold: 600   /* Headings */
--font-bold: 700       /* Strong emphasis */
```

## Spacing System (8px Base)
```css
--space-1: 0.25rem   /* 4px */
--space-2: 0.5rem    /* 8px */
--space-3: 0.75rem   /* 12px */
--space-4: 1rem      /* 16px */
--space-5: 1.25rem   /* 20px */
--space-6: 1.5rem    /* 24px */
--space-8: 2rem      /* 32px */
--space-10: 2.5rem   /* 40px */
--space-12: 3rem     /* 48px */
```

## Shadows (Subtle Depth)
```css
--shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05)
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1)
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1)
--shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1)
```

## Border Radius (Subtle Roundness)
```css
--rounded-sm: 0.25rem   /* 4px - Small elements */
--rounded-md: 0.375rem  /* 6px - Cards, buttons */
--rounded-lg: 0.5rem    /* 8px - Larger cards */
--rounded-xl: 0.75rem   /* 12px - Modal, dialog */
```

## Component Patterns

### Cards
- Subtle shadow (`shadow-sm`)
- Border (`border-slate-200`)
- Rounded corners (`rounded-lg`)
- Padding (`p-6`)
- Hover state with lift effect

### Stat Cards
- Compact header with icon
- Large number typography
- Subtle trend indicator
- Sparkline or mini chart
- Click-to-expand capability

### Task Cards
- Priority indicator (left border)
- Status badge (top-right)
- Avatar stack for assignees
- Progress bar (if applicable)
- Hover actions (right side)
- Due date with relative time

### Tables/Lists
- Zebra striping (subtle)
- Row hover state
- Sticky header
- Action menu on hover
- Empty states with illustration

## Interactive States

### Hover
- Subtle background change (`bg-slate-50`)
- Shadow lift (`shadow-md`)
- Icon color shift
- Smooth transition (150ms)

### Focus
- Ring outline (`ring-2 ring-blue-500`)
- No layout shift
- Clear visual feedback

### Active
- Darker background
- Inset shadow
- Scale transform (98%)

### Loading
- Skeleton screens (not spinners)
- Pulse animation
- Progressive disclosure

## Micro-interactions

### Page Transitions
- Fade in from bottom (slide up 8px)
- Stagger child elements (50ms delay)
- Duration: 200-300ms

### Button Clicks
- Scale down to 98%
- Ripple effect (optional)
- Haptic feedback (visual)

### Data Updates
- Highlight changed values (yellow flash)
- Number counter animations
- Smooth chart transitions

### Notifications
- Slide in from top-right
- Auto-dismiss after 5s
- Stack multiple notifications

## Layout Principles

### Dashboard Layout
1. **Sidebar**: Fixed left, 256px width, collapsible
2. **Header**: Sticky top, minimal height (64px)
3. **Main Content**: Max-width 1400px, centered
4. **Quick Actions**: Floating action button (bottom-right)

### Content Sections
- Clear section dividers (subtle border)
- Consistent spacing (mb-8 between sections)
- Section headers with action buttons
- Breadcrumb navigation

### Information Hierarchy
1. Page title (text-3xl, font-bold)
2. Section headers (text-2xl, font-semibold)
3. Card titles (text-xl, font-medium)
4. Body text (text-sm, font-normal)
5. Metadata (text-xs, text-slate-600)

## Productivity Features

### Quick Actions
- Keyboard shortcuts (visible hints)
- Command palette (Cmd+K)
- Right-click context menus
- Drag-and-drop support

### Data Visualization
- Sparklines for trends
- Mini donut charts for percentages
- Progress bars with labels
- Color-coded metrics

### Smart Defaults
- Auto-focus on modals
- Remember last view state
- Intelligent date pickers
- Smart filters with saved presets

## Accessibility
- WCAG 2.1 AA compliance
- Keyboard navigation
- Screen reader support
- High contrast mode support
- Focus indicators
- Alt text for all images

## Animation Guidelines
- Use `ease-out` for entrances
- Use `ease-in` for exits
- Keep durations under 300ms
- Respect prefers-reduced-motion
- Animate transforms and opacity (not layout properties)
