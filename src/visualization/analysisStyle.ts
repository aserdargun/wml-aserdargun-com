import type { ModelId } from '../core'
export const modelAppearance: Record<
  ModelId,
  { color: string; dash?: string }
> = {
  constant: { color: '#94664a', dash: '3 5' },
  dynamics: { color: '#285e47' },
  biased: { color: '#596da5', dash: '9 4' },
}
