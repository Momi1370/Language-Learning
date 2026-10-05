import { fsrs, generatorParameters, createEmptyCard, Rating } from '../vendor/ts-fsrs.mjs';

const scheduler = fsrs(generatorParameters({ enable_fuzz: true }));

export const Grade = Object.freeze({
  Again: Rating.Again,
  Hard: Rating.Hard,
  Good: Rating.Good,
  Easy: Rating.Easy,
});

const plain = (card) => JSON.parse(JSON.stringify(card));

export function newCard(now = new Date()) {
  return plain(createEmptyCard(now));
}

export function review(card, grade, now = new Date()) {
  return plain(scheduler.next(card, now, grade).card);
}

export function isDue(card, now = new Date()) {
  return new Date(card.due).getTime() <= now.getTime();
}

export function isLearned(card) {
  return card.reps > 0;
}
