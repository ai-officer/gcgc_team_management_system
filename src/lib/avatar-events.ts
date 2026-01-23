// Simple event system for avatar updates
// This ensures all components using the current user's avatar stay in sync

type AvatarUpdateListener = (imageUrl: string) => void

class AvatarEventEmitter {
  private listeners: Set<AvatarUpdateListener> = new Set()

  subscribe(listener: AvatarUpdateListener) {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  emit(imageUrl: string) {
    this.listeners.forEach(listener => listener(imageUrl))
  }
}

export const avatarEvents = new AvatarEventEmitter()
