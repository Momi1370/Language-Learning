export const STORAGE_KEY = 'taalmaatje.v1';

export function defaultState() {
  return {
    version: 1,
    position: { week: 1, session: 1 },
    done: [],
    history: [],
    settings: { farsi: true, voiceNl: '', voiceEn: '', extraWords: 0 },
    cards: {},
    myPhrases: [],
    ear: {},
    missions: {},
    extraFor: '',
    finished: false,
  };
}
