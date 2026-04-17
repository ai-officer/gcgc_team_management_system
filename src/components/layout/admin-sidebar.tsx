'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  Settings,
  UserCog,
  ChevronDown,
  ChevronRight,
  Building2,
  Layers,
  Briefcase,
  GitBranch,
  Shield,
  CheckSquare,
  ScrollText
} from 'lucide-react'

interface AdminSidebarProps {
  className?: string
}

interface NavigationItem {
  name: string
  href?: string
  icon: any
  children?: NavigationItem[]
}

const navigation: NavigationItem[] = [
  {
    name: 'Dashboard',
    href: '/admin/dashboard',
    icon: LayoutDashboard
  },
  {
    name: 'User Management',
    icon: UserCog,
    children: [
      {
        name: 'All Users',
        href: '/admin/users',
        icon: UserCog
      },
      {
        name: 'Leaders',
        href: '/admin/users/leaders',
        icon: UserCog
      },
      {
        name: 'Members',
        href: '/admin/users/members',
        icon: UserCog
      },
      {
        name: 'User Tasks',
        href: '/admin/users/tasks',
        icon: CheckSquare
      }
    ]
  },
  {
    name: 'Organization',
    icon: Building2,
    children: [
      {
        name: 'Divisions',
        href: '/admin/divisions',
        icon: GitBranch
      },
      {
        name: 'Departments',
        href: '/admin/departments',
        icon: Building2
      },
      {
        name: 'Sections',
        href: '/admin/sections',
        icon: Layers
      },
      {
        name: 'Teams',
        href: '/admin/teams',
        icon: Users
      },
      {
        name: 'Job Levels',
        href: '/admin/job-levels',
        icon: Briefcase
      },
      {
        name: 'Sector Heads',
        href: '/admin/sector-heads',
        icon: Users
      }
    ]
  },
  {
    name: 'Audit Trail',
    href: '/admin/audit',
    icon: ScrollText
  },
  {
    name: 'Administrators',
    href: '/admin/admins',
    icon: Shield
  },
  {
    name: 'Settings',
    href: '/admin/settings',
    icon: Settings
  }
]

export function AdminSidebar({ className }: AdminSidebarProps) {
  const pathname = usePathname()
  const [expandedItems, setExpandedItems] = useState<string[]>([])

  const toggleExpanded = (itemName: string) => {
    setExpandedItems(prev => 
      prev.includes(itemName) 
        ? prev.filter(name => name !== itemName)
        : [...prev, itemName]
    )
  }

  const isItemActive = (item: NavigationItem): boolean => {
    if (item.href) {
      // For exact matches or when the path continues with a parameter (like /admin/users/123)
      // but not when it's a different sub-route (like /admin/users/leaders)
      if (pathname === item.href) {
        return true
      }
      
      // Check if it's a sub-path with parameters (e.g., /admin/users/123)
      // but exclude other sub-routes at the same level
      const pathAfterItem = pathname.replace(item.href, '')
      if (pathAfterItem.startsWith('/') && !pathAfterItem.includes('/', 1)) {
        // This is likely a parameter route like /admin/users/[id]
        return /^\/[^\/]+$/.test(pathAfterItem)
      }
      
      return false
    }
    
    if (item.children) {
      return item.children.some(child => 
        child.href && (pathname === child.href || pathname.startsWith(child.href + '/'))
      )
    }
    return false
  }

  const renderNavigationItem = (item: NavigationItem) => {
    const isActive = isItemActive(item)
    const isExpanded = expandedItems.includes(item.name)
    const hasChildren = item.children && item.children.length > 0

    if (hasChildren) {
      return (
        <div key={item.name} className="space-y-1">
          <button
            onClick={() => toggleExpanded(item.name)}
            className={cn(
              'flex items-center justify-between w-full px-3 md:px-2 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 text-left md:justify-center lg:justify-between',
              isActive
                ? 'bg-slate-700 text-white border-l-3 border-white'
                : 'text-slate-300 hover:bg-slate-700 hover:text-white'
            )}
          >
            <div className="flex items-center">
              <item.icon
                className={cn(
                  'w-5 h-5 md:mr-3 mr-0',
                  isActive ? 'text-white' : 'text-slate-400'
                )}
              />
              <span className="lg:block md:hidden">{item.name}</span>
            </div>
            {hasChildren && (
              <div className="hidden md:block">
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                )}
              </div>
            )}
          </button>
          
          {isExpanded && (
            <div className="ml-6 space-y-1">
              {item.children?.map((child) => {
                const childIsActive = child.href && (pathname === child.href || pathname.startsWith(child.href + '/'))
                
                return (
                  <Link
                    key={child.name}
                    href={child.href || '#'}
                    className={cn(
                      'flex items-center px-3 py-2 text-sm rounded-lg transition-all duration-200',
                      childIsActive
                        ? 'bg-slate-700 text-white font-medium border-l-2 border-white'
                        : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                    )}
                  >
                    <child.icon
                      className={cn(
                        'w-4 h-4 mr-3',
                        childIsActive ? 'text-white' : 'text-slate-500'
                      )}
                    />
                    {child.name}
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      )
    }

    return (
      <Link
        key={item.name}
        href={item.href || '#'}
        className={cn(
          'flex items-center px-3 md:px-2 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 md:justify-center lg:justify-start',
          isActive
            ? 'bg-slate-700 text-white border-l-3 border-white'
            : 'text-slate-300 hover:bg-slate-700 hover:text-white'
        )}
      >
        <item.icon
          className={cn(
            'w-5 h-5 md:mr-3 mr-0',
            isActive ? 'text-white' : 'text-slate-400'
          )}
        />
        <span className="lg:block md:hidden">{item.name}</span>
      </Link>
    )
  }

  return (
    <div className={cn('flex flex-col bg-[#1e293b] border-r border-slate-700 w-64 lg:w-64 md:w-16 sm:w-16', className)}>
      {/* Logo */}
      <div className="flex items-center px-6 md:px-4 py-6 border-b border-slate-700">
        <div className="flex items-center w-full md:justify-center">
          <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <div className="w-4 h-4 bg-white rounded-sm"></div>
          </div>
          <div className="ml-3 lg:block md:hidden">
            <span className="text-lg font-bold text-white">GCGC</span>
            <div className="text-xs text-slate-400 font-medium">Admin Portal</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 md:px-2 py-6 space-y-1">
        {navigation.map((item) => renderNavigationItem(item))}
      </nav>

      {/* Footer */}
      <div className="px-4 md:px-2 py-4 border-t border-slate-700">
        <div className="text-xs text-slate-400 text-center lg:block md:hidden">
          Team Management System v1.0
        </div>
        <div className="text-xs text-slate-400 text-center lg:hidden md:block">
          v1.0
        </div>
      </div>
    </div>
  )
}