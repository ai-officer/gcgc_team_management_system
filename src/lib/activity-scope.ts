export function activityScopeUserIds(
  viewer: { id: string; role?: string | null },
  directReportIds: string[]
): string[] | null {
  if (viewer.role === 'ADMIN') return null
  return Array.from(new Set([viewer.id, ...directReportIds]))
}
