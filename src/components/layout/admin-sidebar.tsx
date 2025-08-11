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
  Shield
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
      return pathname === item.href || pathname.startsWith(item.href + '/')
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
                ? 'bg-blue-50 text-blue-700 border-l-3 border-blue-600'
                : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
            )}
          >
            <div className="flex items-center">
              <item.icon 
                className={cn(
                  'w-5 h-5 md:mr-3 mr-0',
                  isActive ? 'text-blue-600' : 'text-gray-500'
                )} 
              />
              <span className="lg:block md:hidden">{item.name}</span>
            </div>
            {hasChildren && (
              <div className="hidden md:block">
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-400" />
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
                        ? 'bg-blue-50 text-blue-700 font-medium border-l-2 border-blue-600'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    )}
                  >
                    <child.icon 
                      className={cn(
                        'w-4 h-4 mr-3',
                        childIsActive ? 'text-blue-600' : 'text-gray-400'
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
            ? 'bg-blue-50 text-blue-700 border-l-3 border-blue-600'
            : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
        )}
      >
        <item.icon 
          className={cn(
            'w-5 h-5 md:mr-3 mr-0',
            isActive ? 'text-blue-600' : 'text-gray-500'
          )} 
        />
        <span className="lg:block md:hidden">{item.name}</span>
      </Link>
    )
  }

  return (
    <div className={cn('flex flex-col bg-white border-r border-gray-200 shadow-sm w-64 lg:w-64 md:w-16 sm:w-16', className)}>
      {/* Logo */}
      <div className="flex items-center px-6 md:px-4 py-6 border-b border-gray-200">
        <div className="flex items-center w-full md:justify-center">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center shadow-sm">
            <div className="w-4 h-4 bg-white rounded-sm"></div>
          </div>
          <div className="ml-3 lg:block md:hidden">
            <span className="text-lg font-bold text-gray-900">GCGC</span>
            <div className="text-xs text-gray-500 font-medium">Admin Portal</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 md:px-2 py-6 space-y-1">
        {navigation.map((item) => renderNavigationItem(item))}
      </nav>
      
      {/* Footer */}
      <div className="px-4 md:px-2 py-4 border-t border-gray-200 bg-gray-50/50">
        <div className="text-xs text-gray-500 text-center lg:block md:hidden">
          Team Management System v1.0
        </div>
        <div className="text-xs text-gray-500 text-center lg:hidden md:block">
          v1.0
        </div>
      </div>
    </div>
  )
}