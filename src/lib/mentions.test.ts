import { describe, it, expect } from 'vitest'
import { parseMentions, splitMentions } from './mentions'

describe('parseMentions', () => {
  it('matches a simple @mention against a candidate (case-insensitive)', () => {
    expect(parseMentions('@alice rocks', [{ id: '1', name: 'Alice' }])).toEqual(['1'])
  })

  it('returns [] when there are no mentions', () => {
    expect(parseMentions('no mentions here', [{ id: '1', name: 'Alice' }])).toEqual([])
  })

  it('matches multiple distinct mentions', () => {
    expect(
      parseMentions('@alice + @Bob Lee', [
        { id: '1', name: 'Alice' },
        { id: '2', name: 'Bob Lee' },
      ]),
    ).toEqual(['1', '2'])
  })

  it('prefers the longest candidate name (no spurious shorter match)', () => {
    expect(
      parseMentions('hey @John Smith here', [
        { id: '1', name: 'John Smith' },
        { id: '2', name: 'John' },
      ]),
    ).toEqual(['1'])
  })

  it('does not match an @ preceded by a word character (e.g. an email address)', () => {
    expect(parseMentions('email foo@bar.com', [{ id: '1', name: 'Bar' }])).toEqual([])
  })

  it('requires a word boundary after the name (no trailing-word false match)', () => {
    expect(parseMentions('@Bobby rocks', [{ id: '1', name: 'Bob' }])).toEqual([])
  })

  it('dedupes when the same person is mentioned twice', () => {
    expect(parseMentions('@Alice and @alice again', [{ id: '1', name: 'Alice' }])).toEqual(['1'])
  })

  it('ignores blank candidate names', () => {
    expect(parseMentions('@alice', [{ id: '1', name: '' }, { id: '2', name: 'Alice' }])).toEqual(['2'])
  })
})

describe('splitMentions', () => {
  it('splits a mention out of surrounding plain text (preserving casing)', () => {
    expect(splitMentions('hi @Alice!', ['Alice'])).toEqual([
      { value: 'hi ', isMention: false },
      { value: '@Alice', isMention: true },
      { value: '!', isMention: false },
    ])
  })

  it('returns a single plain segment when nothing matches', () => {
    expect(splitMentions('no mentions here', ['Alice'])).toEqual([
      { value: 'no mentions here', isMention: false },
    ])
  })

  it('does not highlight an @ preceded by a word char (email)', () => {
    expect(splitMentions('email foo@bar.com', ['Bar'])).toEqual([
      { value: 'email foo@bar.com', isMention: false },
    ])
  })

  it('highlights the longest name and handles multiple mentions', () => {
    expect(splitMentions('@John Smith and @alice', ['John', 'John Smith', 'Alice'])).toEqual([
      { value: '@John Smith', isMention: true },
      { value: ' and ', isMention: false },
      { value: '@alice', isMention: true },
    ])
  })
})
