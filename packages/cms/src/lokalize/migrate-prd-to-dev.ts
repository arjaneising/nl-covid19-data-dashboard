import { assert } from '@corona-dashboard/common';
import { getClient } from '../client';
import { LokalizeText } from './types';

/**
 * This script takes all the lokalize text documents from production and uses
 * those to replace equivalent documents in the development dataset.
 *
 * This is done because we want to have matching document ids in both datasets
 * in order to implement logic around "move" mutations, and currently both
 * datasets use independent document ids for each lokalize key.
 */
(async function run() {
  const devClient = await getClient('development');
  const prdClient = await getClient('production');

  const allDevDraftTexts =
    (await devClient.fetch(`*[_type == 'lokalizeText' && (_id in path("drafts.**"))] |
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

  /**
   * For each production document, look up the equivalent key in development and
   * delete that document to replace it with one from production stored under
   * the production document id.
   */
  for (const doc of allPrdPublishedTexts) {
    try {
      const documentToDelete = await devClient.fetch(
        `*[_type == 'lokalizeText' && key == '${doc.key}'][0]`
      );

      assert(documentToDelete._id, 'No document _id in result');

      console.log(`Replacing ${doc.key} from dev as ${documentToDelete._id}`);

      await devClient
        .transaction()
        .delete(documentToDelete._id)
        .createOrReplace(doc)
        .commit();
    } catch (err) {
      console.error(`Failed to process document ${doc.key}: ${err.message}`);
    }
  }
})().catch((err) => {
  console.error('An error occurred:', err.message);
  process.exit(1);
});
