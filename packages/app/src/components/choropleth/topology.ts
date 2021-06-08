import { FeatureCollection, MultiPolygon } from 'geojson';
import * as topojson from 'topojson-client';

// Load all the geographical data including the data entries (regions and municipalities)
import topology from './geography-simplified.topo.json';
import topologyWorld from '~/components/choropleth/ne_50m_admin_0_countries.topo.json';
import { MunicipalGeoJSON, RegionGeoJSON } from '@corona-dashboard/common';

export const countryGeo = topojson.feature(
  topology,
  topology.objects.netherlands
) as FeatureCollection<MultiPolygon>;

export const regionGeo = topojson.feature(
  topology,
  topology.objects.safetyregions
) as RegionGeoJSON;

export const municipalGeo = topojson.feature(
  topology,
  topology.objects.municipalities
) as MunicipalGeoJSON;

export const countriesGeo = topojson.feature(
  topologyWorld,
  topologyWorld.objects.ne_50m_admin_0_countries
) as CountriesGeoJSON;

export type CountriesGeoProperties =
  typeof topologyWorld['objects']['ne_50m_admin_0_countries']['geometries'][number]['properties'];

export type CountriesGeoJSON = FeatureCollection<
  MultiPolygon,
  CountriesGeoProperties
>;
