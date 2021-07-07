import path from 'path';
import fs from 'fs';
import { EOL } from 'os';
import { parse } from '@fast-csv/parse';
import { sortBy } from 'lodash';
import {
  fetchLocalTextsFlatten,
  fetchLocalTextsFromCacheFlatten,
} from './fetch';
import { ID_PREFIX, removeIdsFromKeys } from '@corona-dashboard/common';
import { flatten } from 'flat';

const MUTATIONS_LOG_FILE = path.join(__dirname, '../key-mutations.csv');
const HEADER = `timestamp,action,key${EOL}`;

type Action = 'add' | 'delete' | 'noop' | 'add_via_move';

export interface TextMutation {
  timestamp: string;
  action: Action;
  key: string;
}

export function clearMutationsLogFile() {
  try {
    fs.writeFileSync(MUTATIONS_LOG_FILE, HEADER);
  } catch (err) {
    console.error(
      `Failed to clear mutations log file ${MUTATIONS_LOG_FILE}: ${err.message}`
    );
  }
}

export function appendTextMutation(
  action: Exclude<Action, 'noop'>,
  key: string
) {
  const timestamp = new Date().toISOString();

  try {
    const line = `${timestamp},${action},${key}${EOL}`;
    fs.appendFileSync(MUTATIONS_LOG_FILE, line);
  } catch (err) {
    console.error(
      `Failed to write mutation to file ${MUTATIONS_LOG_FILE}: ${err.message}`
    );
  }
}

export function readTextMutations() {
  return new Promise<TextMutation[]>((resolve, reject) => {
    let mutations: TextMutation[] = [];

    const stream = parse({ headers: true })
      .on('error', (err) => reject(err))
      .on('data', (x) => mutations.push(x))
      .on('end', () => resolve(mutations));

    stream.write(fs.readFileSync(MUTATIONS_LOG_FILE));
    stream.end();
  });
}

/**
 * This function collapses the mutations so that an add + delete (or vice-versa)
 * doesn't result in any sync action. It will return the action together with
 * the last mutation timestamp for that key. Deletions are filtered out so that
 * we can run sync-additions half-way the sprint to pass keys to the
 * communication team to prepare for release. Deletions are handled differently
 * via the sync-deletions script.
 */
export function collapseTextMutations(mutations: TextMutation[]) {
  const weightByAction = {
    add: 1,
    delete: -1,
    noop: 0,
  } as const;

  const sortedMutations = sortBy(mutations, (x) => x.timestamp);

  const collapsedKeys = sortedMutations.reduce((acc, mutation) => {
    const prev = acc[mutation.key] || { weight: 0, timestamp: 0 };
    const action = mutation.action === 'add_via_move' ? 'add' : mutation.action;

    acc[mutation.key] = {
      /**
       * We will perform deletes by only writing to the mutation log, to
       * prevent a delete in a feature branch from breaking the develop branch
       * builds. But this also means that we have no easy way to prevent you
       * from running multiple delete actions on the same key. To make the
       * collapse work properly, we need to limit the "amount of deletes" to
       * one when summing. This is done by cliping the weight to -1.
       */
      weight: Math.max(weightByAction[action] + prev.weight, -1),
      timestamp: mutation.timestamp,
    };
    return acc;
  }, {} as Record<string, { weight: number; timestamp: string }>);

  /**
   * Because new keys are added immediately, but deletions are only scheduled
   * for later. We still need to mark the keys that were first newly created, but
   * later deleted as action "delete" otherwise they will not be removed from the
   * dataset.
   *
   * On the other hand, if a key existed at first and in this branch was deleted
   * and re-added again, we do NOT want to delete the key. That is an edge case
   * but an important one.
   *
   * By keeping a list of keys that got added first (and then whatever) we can
   * figure out that if the final weight/action was 0/noop, the key still needs
   * to be deleted.
   */
  const firstActionByKey = sortedMutations.reduce((acc, mutation) => {
    if (!acc[mutation.key]) {
      acc[mutation.key] = mutation.action;
    }
    return acc;
  }, {} as Record<string, Action>);

  const keysThatWereAddedAtFirst: string[] = Object.entries(firstActionByKey)
    .filter(([_key, action]) => action === 'add')
    .map(([key]) => key);

  return Object.entries(collapsedKeys).map(
    ([key, { weight, timestamp }]) =>
      ({
        key,
        action:
          weight > 0
            ? 'add'
            : weight < 0
            ? 'delete'
            : keysThatWereAddedAtFirst.includes(key)
            ? 'delete'
            : 'noop',
        timestamp,
      } as TextMutation)
  );
}

export async function getLocalMutations() {
  const oldFlattenTexts = await fetchLocalTextsFromCacheFlatten();
  const newFlattenTexts = await fetchLocalTextsFlatten();
  const newFlattenTextsWithoutIds = flatten(
    removeIdsFromKeys(newFlattenTexts)
  ) as any;
  const oldKeys = Object.keys(oldFlattenTexts);
  const newKeys = Object.keys(newFlattenTexts);

  const removedKeyIdPairs = oldKeys
    .filter((key) => !newKeys.includes(key))
    .map(parseKeyWithId);

  const addedKeyIdPairs = newKeys
    .filter((key) => !oldKeys.includes(key))
    .map(parseKeyWithId);

  const mutations = {
    add: [] as { key: string; text: string }[],
    move: [] as { key: string; oldKey: string; text: string; id: string }[],
    delete: [] as { key: string; id: string }[],
  };

  removedKeyIdPairs.forEach(([key, id]) => {
    mutations.delete.push({ key, id });
  });

  addedKeyIdPairs.forEach(([key, id]) => {
    const deleted = mutations.delete.find((x) => x.id === id);
    if (deleted) {
      mutations.delete = mutations.delete.filter((x) => x !== deleted);
      mutations.move.push({
        key,
        oldKey: deleted.key,
        id,
        text: newFlattenTextsWithoutIds[key],
      });
    } else {
      mutations.add.push({ key, text: newFlattenTextsWithoutIds[key] });
    }
  });

  return mutations;
}

function parseKeyWithId(keyWithId: string) {
  const [key, id] = keyWithId.split(ID_PREFIX);
  return [key, id] as [key: string, id: string];
}
