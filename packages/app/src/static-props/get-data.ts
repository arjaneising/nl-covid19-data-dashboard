import {
  assert,
  Gm,
  GmCollection,
  InCollection,
  Nl,
  sortTimeSeriesInDataInPlace,
  In,
  Vr,
  VrCollection,
} from '@corona-dashboard/common';
import { SanityClient } from '@sanity/client';
import set from 'lodash/set';
import { GetStaticPropsContext } from 'next';
import { AsyncWalkBuilder } from 'walkjs';
import { gmData } from '~/data/gm';
import { vrData } from '~/data/vr';
import { CountryCode } from '~/domain/international/select-countries/country-code';
import {
  gmPageMetricNames,
  GmPageMetricNames,
} from '~/domain/layout/municipality-layout';
import {
  NlPageMetricNames,
  nlPageMetricNames,
} from '~/domain/layout/national-layout';
import {
  vrPageMetricNames,
  VrRegionPageMetricNames,
} from '~/domain/layout/safety-region-layout';
import { getClient, localize } from '~/lib/sanity';
import { loadJsonFromDataFile } from './utils/load-json-from-data-file';

/**
 * Usage:
 *
 *     export const getStaticProps = createGetStaticProps(
 *       getLastGeneratedDate,
 *       selectVrPageMetricData('metric_name1', 'metric_name2'),
 *       createGetChoroplethData({
 *         gm: x => ({ y: x.hospital_nice})
 *       })
 *     )({});
 */

const json = {
  nl: loadJsonFromDataFile<Nl>('NL.json'),
  vrCollection: loadJsonFromDataFile<VrCollection>('VR_COLLECTION.json'),
  gmCollection: loadJsonFromDataFile<GmCollection>('GM_COLLECTION.json'),
  inCollection: loadJsonFromDataFile<InCollection>(
    'IN_COLLECTION.json',
    undefined,
    true
  ),
};

export function getLastGeneratedDate() {
  return {
    lastGenerated: json.nl.last_generated,
  };
}

export function createGetContent<T>(
  queryOrQueryGetter: string | ((context: GetStaticPropsContext) => string)
) {
  return async (context: GetStaticPropsContext) => {
    const client = await getClient();
    const query =
      typeof queryOrQueryGetter === 'function'
        ? queryOrQueryGetter(context)
        : queryOrQueryGetter;

    const rawContent = (await client.fetch<T>(query)) ?? {};
    //@TODO We need to switch this from process.env to context as soon as we use i18n routing
    const locale = process.env.NEXT_PUBLIC_LOCALE || 'nl';

    // this function call will mutate `rawContent`
    await replaceReferencesInContent(rawContent, client);

    const content = localize(rawContent, [locale, 'nl']) as T;
    return { content };
  };
}

/**
 * This function will mutate an object which is a reference to another document.
 * The reference-object's keys will be deleted and all reference document-keys
 * will be added.
 * eg:
 * { _type: 'reference', _ref: 'abc' }
 * becomes:
 * { _type: 'document', id: 'abc', title: 'foo', body: 'bar' }
 */
async function replaceReferencesInContent(
  input: unknown,
  client: SanityClient,
  resolvedIds: string[] = []
) {
  await new AsyncWalkBuilder()
    .withGlobalFilter((x) => x.val?._type === 'reference')
    .withSimpleCallback(async (node) => {
      const refId = node.val._ref;

      assert(typeof refId === 'string', 'node.val._ref is not set');

      if (resolvedIds.includes(refId)) {
        const ids = `[${resolvedIds.concat(refId).join(',')}]`;
        throw new Error(
          `Ran into an infinite loop of references, please investigate the following sanity document order: ${ids}`
        );
      }

      const doc = await client.fetch(`*[_id == '${refId}']{...}[0]`);

      await replaceReferencesInContent(doc, client, resolvedIds.concat(refId));

      /**
       * Here we'll mutate the original reference object by clearing the
       * existing keys and adding all keys of the reference itself.
       */
      Object.keys(node.val).forEach((key) => delete node.val[key]);
      Object.keys(doc).forEach((key) => (node.val[key] = doc[key]));
    })
    .walk(input);
}

/**
 * This method returns all the national data that is required by the sidebar,
 * optional extra metric property names can be added as separate arguments which will
 * be added to the output
 *
 */
export function selectNlPageMetricData<T extends keyof Nl = NlPageMetricNames>(
  ...additionalMetrics: T[]
) {
  return selectNlData(...[...nlPageMetricNames, ...additionalMetrics]);
}

/**
 * This method selects only the specified metric properties from the national data
 *
 */
export function selectNlData<T extends keyof Nl = never>(...metrics: T[]) {
  return () => {
    const { data } = getNlData();

    const selectedNlData = metrics.reduce(
      (acc, p) =>
        set(
          acc,
          p,
          /**
           * convert `undefined` values to `null` because nextjs cannot pass
           * undefined values via initial props.
           */
          data[p] ?? null
        ),
      {} as Pick<Nl, T>
    );

    return { selectedNlData };
  };
}

export function getNlData() {
  // clone data to prevent mutation of the original
  const data = JSON.parse(JSON.stringify(json.nl)) as Nl;

  sortTimeSeriesInDataInPlace(data, { setDatesToMiddleOfDay: true });

  return { data };
}

/**
 * This method returns all the region data that is required by the sidebar,
 * optional extra metric property names can be added as separate arguments which will
 * be added to the output
 *
 */
export function selectVrPageMetricData<
  T extends keyof Vr = VrRegionPageMetricNames
>(...additionalMetrics: T[]) {
  return selectVrData(...[...vrPageMetricNames, ...additionalMetrics]);
}

/**
 * This method selects only the specified metric properties from the region data
 *
 */
export function selectVrData<T extends keyof Vr = never>(...metrics: T[]) {
  return (context: GetStaticPropsContext) => {
    const vrData = getVrData(context);

    const selectedVrData = metrics.reduce(
      (acc, p) => set(acc, p, vrData.data[p]),
      {} as Pick<Vr, T>
    );

    return { selectedVrData, safetyRegionName: vrData.safetyRegionName };
  };
}

export function getVrData(context: GetStaticPropsContext) {
  const code = context.params?.code as string | undefined;

  if (!code) {
    throw Error('No valid vrcode found in context');
  }

  const data = loadAndSortVrData(code);

  const safetyRegionName = getVrName(code);

  return {
    data,
    safetyRegionName,
  };
}

export function getVrName(code: string) {
  const safetyRegion = vrData.find((x) => x.code === code);
  return safetyRegion?.name || '';
}

export function loadAndSortVrData(vrcode: string) {
  const data = loadJsonFromDataFile<Vr>(`${vrcode}.json`);

  sortTimeSeriesInDataInPlace(data, { setDatesToMiddleOfDay: true });

  return data;
}

/**
 * This method returns all the municipal data that is required by the sidebar,
 * optional extra metric property names can be added as separate arguments which will
 * be added to the output
 *
 */
export function selectGmPageMetricData<T extends keyof Gm = GmPageMetricNames>(
  ...additionalMetrics: T[]
) {
  return selectGmData(...[...gmPageMetricNames, ...additionalMetrics]);
}

/**
 * This method selects only the specified metric properties from the municipal data
 *
 */
export function selectGmData<T extends keyof Gm = never>(...metrics: T[]) {
  return (context: GetStaticPropsContext) => {
    const gmData = getGmData(context);

    const selectedGmData = metrics.reduce(
      (acc, p) => set(acc, p, gmData.data[p]),
      {} as Pick<Gm, T>
    );

    return { selectedGmData, municipalityName: gmData.municipalityName };
  };
}

export function getGmData(context: GetStaticPropsContext) {
  const code = context.params?.code as string | undefined;

  if (!code) {
    throw Error('No valid gmcode found in context');
  }

  const data = loadJsonFromDataFile<Gm>(`${code}.json`);

  const municipalityName = gmData.find((x) => x.gemcode === code)?.name || '';

  sortTimeSeriesInDataInPlace(data, { setDatesToMiddleOfDay: true });

  return { data, municipalityName };
}

const NOOP = () => null;

export function createGetChoroplethData<T1, T2, T3>(settings?: {
  vr?: (collection: VrCollection) => T1;
  gm?: (collection: GmCollection) => T2;
  in?: (collection: InCollection) => T3;
}) {
  return () => {
    const filterVr = settings?.vr ?? NOOP;
    const filterGm = settings?.gm ?? NOOP;
    const filterIn = settings?.in ?? NOOP;

    return {
      choropleth: {
        vr: filterVr(json.vrCollection) as T1,
        gm: filterGm(json.gmCollection) as T2,
        in: filterIn(json.inCollection) as T3,
      },
    };
  };
}

export function getInData(countryCodes: CountryCode[]) {
  return function () {
    const internationalData: Record<string, In> = {};
    countryCodes.forEach((countryCode) => {
      internationalData[countryCode] = loadJsonFromDataFile<In>(
        `IN_${countryCode.toUpperCase()}.json`
      );
    });
    return { internationalData } as {
      internationalData: Record<CountryCode, In>;
    };
  };
}
