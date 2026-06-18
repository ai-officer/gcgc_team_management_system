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

  it('HTML-escapes user content to prevent injection in the email body', () => {
    const { html } = renderNotificationEmail({ title: '<img src=x onerror=alert(1)>', message: '</p><a href="evil">x</a>' })
    expect(html).not.toContain('<img src=x onerror=alert(1)>')
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;')
    expect(html).not.toContain('<a href="evil">')
  })
})
