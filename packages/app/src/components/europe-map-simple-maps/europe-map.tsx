import countriesTopoJson from '~/components/choropleth/ne_50m_admin_0_countries.topo.json';
import css from '@styled-system/css';
import {
  ComposableMap,
  Geographies,
  Geography,
  Sphere,
  Graticule,
  ZoomableGroup,
} from 'react-simple-maps';

export function EuropeMapSimpleMaps() {
  return (
    <div>
      <div css={css({ height: 300, '& > *': { height: '100%' } })}>
        <ComposableMap>
          <ZoomableGroup>
            <Sphere id="asd" fill="#fff" stroke="#E4E5E6" strokeWidth={0.5} />
            <Graticule stroke="#E4E5E6" strokeWidth={0.5} />
            <Geographies geography={countriesTopoJson}>
              {({ geographies }) =>
                geographies.map((geo) => (
                  <Geography key={geo.rsmKey} geography={geo} tabIndex={-1} />
                ))
              }
            </Geographies>
          </ZoomableGroup>
        </ComposableMap>
      </div>
    </div>
  );
}
