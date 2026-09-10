import { parseManifest, type ExperimentDefinition, type LessonDefinition } from '@aserdargun/lab-core'
import rawManifest from '../../lab.manifest.json'
import rawExperiments from './experiments.json'
import { chapters } from '../lessons/content'
import type { ScenarioId } from '../core/types'
export const manifest = parseManifest(rawManifest)
export const experiments = rawExperiments as ExperimentDefinition<{scenarioId: ScenarioId}>[]
const en = chapters('en'), tr = chapters('tr')
export const guidedLesson: LessonDefinition = {
  schemaVersion: '0.1', id: 'world-model-101', title: manifest.lessons![0].title,
  concepts: manifest.concepts,
  steps: en.map((step, index) => ({
    id: `chapter-${index + 1}`, title: {en: step.title, tr: tr[index].title},
    explanation: {en: step.text, tr: tr[index].text}, experimentId: 'planning',
    mode: step.lens,
    completion: step.task === 'view' ? {kind: 'manual'} : {kind: 'app-signal', signal: step.task},
  })),
}
/** Only declared routes select a scenario. No cross-lab payload profile is supported yet. */
export function initialRoute(search: string): {scenario: ScenarioId; lesson: boolean; locale: 'en' | 'tr' | undefined} {
  const query = new URLSearchParams(search)
  const lesson = query.get('lesson') === guidedLesson.id
  const requested = query.get('scenario')
  const scenario = lesson ? 'planning' : experiments.find(e => e.id === requested)?.config?.scenarioId ?? 'planning'
  const lang = query.get('lang')
  return {scenario, lesson, locale: lang === 'en' || lang === 'tr' ? lang : undefined}
}
