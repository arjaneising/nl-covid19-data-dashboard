import css from '@styled-system/css';
import { Feature, MultiPolygon } from 'geojson';
import { useCallback } from 'react';
import { colors } from '~/style/theme';
import { InlineText } from '../typography';
import { Choropleth } from './choropleth';
import { HoverPathLink, Path } from './path';
import {
  countriesGeo,
  CountriesGeoJSON,
  CountriesGeoProperties,
} from './topology';

const europeGeo: CountriesGeoJSON = {
  ...countriesGeo,
  features: countriesGeo.features.filter(
    (x) => x.properties.REGION_UN === 'Europe' && x.properties.NAME !== 'Russia'
  ),
};

/**
 * This component renders a map of the Netherlands with the outlines of all the
 * safety regions which receive a fill color based on the specified Region
 * metric data.
 *
 * The metricName plus the metricProperty together specify which value is
 * visualized. The color scale is calculated using the specified metric and the
 * given gradient.
 *
 * When a selected region code is specified, the map will zoom in on the safety
 * region.
 */
export function EuropeChoropleth() {
  const renderFeature = useCallback(
    (feature: Feature<MultiPolygon, CountriesGeoProperties>, path: string) => {
      return (
        <Path
          key={path}
          pathData={path}
          fill={colors.data.underReported}
          stroke={colors.silver}
          strokeWidth={0.5}
        />
      );
    },
    []
  );

  const renderHover = useCallback(
    (feature: Feature<MultiPolygon, CountriesGeoProperties>, path: string) => {
      let { FORMAL_EN } = feature.properties;
      FORMAL_EN ??= 'N/A';

      return (
        <HoverPathLink
          isTabInteractive={false}
          key={FORMAL_EN}
          title={FORMAL_EN}
          id={FORMAL_EN}
          pathData={path}
          onFocus={() => undefined}
          onBlur={() => undefined}
        />
      );
    },
    []
  );

  return (
    <div css={css({ bg: 'transparent', position: 'relative', height: '100%' })}>
      <Choropleth
        minHeight={500}
        description={'dataDescription'}
        featureCollection={europeGeo}
        hovers={europeGeo}
        boundingBox={europeGeo}
        renderFeature={renderFeature}
        getTooltipContent={(x) => (
          <InlineText p={2}>{JSON.stringify(x)}</InlineText>
        )}
        renderHover={renderHover}
      />
    </div>
  );
}
