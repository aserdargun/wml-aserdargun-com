export type Locale = 'en' | 'tr'
export const say = (locale: Locale, en: string, tr: string) =>
  locale === 'tr' ? tr : en
export const objectName = (id: string, locale: Locale) =>
  ({
    'yellow cube': say(locale, 'Yellow cube', 'Sarı küp'),
    'blue cube': say(locale, 'Blue cube', 'Mavi küp'),
    cube: say(locale, 'Blue cube', 'Mavi küp'),
    blue: say(locale, 'Blue cube', 'Mavi küp'),
    ball: say(locale, 'Ball', 'Top'),
    robot: say(locale, 'Robot', 'Robot'),
    obstacle: say(locale, 'Obstacle', 'Engel'),
    panel: say(locale, 'Occlusion panel', 'Görüş perdesi'),
    ramp: say(locale, 'Ramp', 'Rampa'),
    goal: say(locale, 'Target', 'Hedef'),
    floor: say(locale, 'Floor', 'Zemin'),
  })[id] || id
export const actionName = (
  id: string,
  locale: Locale,
  scenario = 'planning',
) =>
  scenario !== 'planning'
    ? {
        direct: say(locale, 'A · Push forward', 'A · İleri it'),
        left: say(locale, 'B · Push left', 'B · Sola it'),
        right: say(locale, 'C · Push right', 'C · Sağa it'),
        wait: say(locale, 'D · Wait', 'D · Bekle'),
      }[id] || id
    : {
        direct: say(locale, 'A · Direct push', 'A · Doğrudan it'),
        left: say(locale, 'B · Left detour', 'B · Soldan dolaş'),
        right: say(locale, 'C · Right detour', 'C · Sağdan dolaş'),
        wait: say(locale, 'D · Wait', 'D · Bekle'),
      }[id] || id
