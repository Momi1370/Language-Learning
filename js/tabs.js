// The four tabs of the bottom bar (index.html draws them) and which tab each screen belongs to.
export const TABS = [
  { id: 'today', label: 'Today', href: '#/today' },
  { id: 'words', label: 'Words', href: '#/words' },
  { id: 'progress', label: 'Progress', href: '#/progress' },
  { id: 'settings', label: 'Settings', href: '#/settings' },
];

// Both word languages (#/words, #/woorden) and their lists are the Words tab; the lesson blocks belong to Today.
export function tabOf(route) {
  const first = route.split('/')[0];
  if (first === 'woorden') return 'words';
  return TABS.some((t) => t.id === first) ? first : 'today';
}
