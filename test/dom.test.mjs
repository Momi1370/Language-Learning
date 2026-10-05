import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mount } from '../js/ui/dom.js';

test('mount flattens lists and skips null, undefined and false', () => {
  let got = null;
  const parent = { append: (...children) => { got = children; } };
  const a = { node: 'a' };
  const b = { node: 'b' };
  assert.equal(mount(parent, null, [a, [b, undefined]], false, 'text'), parent);
  assert.deepEqual(got, [a, b, 'text']);
});
