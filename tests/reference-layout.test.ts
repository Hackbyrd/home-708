import { afterEach, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { emptyLayout, useLayoutStore } from '../apps/web/src/stores/index';

afterEach(() => vi.unstubAllGlobals());

it('backs up the previous arrangement once and preserves subsequent editor changes', () => {
  const old = { ...emptyLayout('My old arrangement'), edits: { chair: { x: 12, z: 9 } } };
  const values = new Map([['cityhome-layout-v2', JSON.stringify(old)]]);
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  });
  setActivePinia(createPinia());
  const store = useLayoutStore();
  store.discoverLocalDrafts(); store.loadLocal();
  expect(store.current.edits).toEqual({});
  expect(store.current.name).toBe('Reference photographs');
  expect(JSON.parse(values.get('cityhome-layout-before-reference-2026-09')!)).toEqual(old);
  const subsequent = { ...emptyLayout('New arrangement'), rooms: { Kitchen: { floor: 'tileWhite' } } };
  store.persistLocal(subsequent);
  store.discoverLocalDrafts(); store.loadLocal();
  expect(store.current).toEqual(subsequent);
  expect(JSON.parse(values.get('cityhome-layout-before-reference-2026-09')!)).toEqual(old);
});
