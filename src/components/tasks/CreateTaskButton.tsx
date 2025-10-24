'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import TaskForm from '@/components/tasks/TaskForm'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'

interface CreateTaskButtonProps {
  variant?: 'default' | 'outline' | 'ghost' | 'secondary'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
  onTaskCreated?: () => void
}

export default function CreateTaskButton({
  variant = 'default',
  size = 'default',
  className = '',
  onTaskCreated
}: CreateTaskButtonProps) {
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const handleTaskSubmit = async (data: any) => {
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create task')
      }

      toast({
        title: 'Success',
        description: 'Task created successfully',
      })

      setIsTaskFormOpen(false)

      // Call the callback if provided
      if (onTaskCreated) {
        onTaskCreated()
      }

      // Refresh the page
      router.refresh()
    } catch (error) {
      console.error('Error creating task:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create task',
        variant: 'destructive',
      })
      throw error
    }
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={() => setIsTaskFormOpen(true)}
      >
        <Plus className="h-4 w-4 mr-2" />
        Create Task
      </Button>

      <TaskForm
        open={isTaskFormOpen}
        onOpenChange={setIsTaskFormOpen}
        onSubmit={handleTaskSubmit}
      />
    </>
  )
}
