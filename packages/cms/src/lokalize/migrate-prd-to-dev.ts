import { assert } from '@corona-dashboard/common';
import { chunk, set } from 'lodash';
import { getClient } from '../client';
import { LokalizeText } from './types';

/**
 * This script takes all the lokalize text documents from production and uses
 * those to replace equivalent documents in the development dataset.
 *
 * This is done because we want to have matching document ids in both datasets
 * in order to implement logic around "move" mutations, and currently both
 * datasets use independent document ids for each lokalize key.
 *
 * Create a backup of lokalize documents first:
 * `curl https://5mog5ask.api.sanity.io/v2021-06-07/data/export/development?types=lokalizeText > backup.ndjson`
 */
(async function run() {
  const devClient = await getClient('development');
  const prdClient = await getClient('production');

  const allDevDraftTexts =
    (await devClient.fetch(`*[_type == 'lokalizeText' && (_id in path("drafts.**"))] |
   order(subject asc)`)) as LokalizeText[];

  const allDevPublishedTexts =
    (await devClient.fetch(`*[_type == 'lokalizeText' && !(_id in path("drafts.**"))] |
   order(subject asc)`)) as LokalizeText[];

  const allPrdPublishedTexts =
    (await prdClient.fetch(`*[_type == 'lokalizeText' && !(_id in path("drafts.**"))] |
    order(subject asc)`)) as LokalizeText[];

  /**
   * Delete dev drafts to avoid dangling documents when the published
   * counterpart get deleted.
   */
  for (const doc of allDevDraftTexts) {
    console.log('Deleting draft from dev', doc._id);
    await devClient.delete(doc._id);
  }

  const devDocumentIdByKey = allDevPublishedTexts.reduce<
    Record<string, string>
  >((acc, v) => set(acc, v.key, v._id), {});

  /**
   * For each production document, look up the equivalent key in development and
   * delete that document to replace it with one from production stored under
   * the production document id.
   */
  const chunks = chunk(allPrdPublishedTexts, 500);

  console.log('chunks', chunks.length);

  for (const docs of chunks) {
    console.log(`Processing ${docs.length} documents`);

    const transaction = devClient.transaction();

    for (const doc of docs) {
      try {
        const documentIdToDelete = devDocumentIdByKey[doc.key];

        assert(documentIdToDelete, `No document id matched for key ${doc.key}`);

        transaction.delete(documentIdToDelete).createOrReplace(doc);
      } catch (err) {
        console.error(`Failed to process document ${doc.key}: ${err.message}`);
      }
    }
    console.log(`Committing transaction...`);
    await transaction.commit();
  }
})().catch((err) => {
  console.error('An error occurred:', err.message);
  process.exit(1);
});
