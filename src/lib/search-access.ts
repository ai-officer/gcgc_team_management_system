export function taskAccessWhere(viewer: { id: string; role?: string | null }): Record<string, unknown> {
  if (viewer.role === 'ADMIN') return {}
  return {
    OR: [
      { assigneeId: viewer.id },
      { creatorId: viewer.id },
      { teamMembers: { some: { userId: viewer.id } } },
      { collaborators: { some: { userId: viewer.id } } },
    ],
  }
}
