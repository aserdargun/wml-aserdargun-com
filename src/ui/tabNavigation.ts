import type { KeyboardEvent } from 'react'

/** Horizontal automatic-activation tabs: arrows wrap, Home/End jump. */
export function navigateTabs(event: KeyboardEvent<HTMLButtonElement>) {
  const tabs = Array.from(event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? [])
  const current = tabs.indexOf(event.currentTarget)
  const next = event.key === 'ArrowRight' ? (current + 1) % tabs.length
    : event.key === 'ArrowLeft' ? (current - 1 + tabs.length) % tabs.length
      : event.key === 'Home' ? 0
        : event.key === 'End' ? tabs.length - 1 : undefined
  if (next === undefined || !tabs[next]) return
  event.preventDefault()
  tabs[next].focus()
  tabs[next].click()
}
