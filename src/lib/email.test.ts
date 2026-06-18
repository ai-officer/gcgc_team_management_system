import { describe, it, expect } from 'vitest'
import { renderNotificationEmail } from './email'

describe('renderNotificationEmail', () => {
  it('puts the title in the subject and title+message in the html', () => {
    const { subject, html } = renderNotificationEmail({ title: 'Task assigned', message: 'You were assigned "Try"', url: 'https://x/y' })
    expect(subject).toContain('Task assigned')
    expect(html).toContain('Task assigned')
    expect(html).toContain('You were assigned')
    expect(html).toContain('https://x/y')
  })
})
