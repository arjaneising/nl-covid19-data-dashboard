import css from '@styled-system/css';
import 'leaflet/dist/leaflet.css';
import { GeoJSON, MapContainer } from 'react-leaflet';
import { countriesGeo } from '../choropleth/topology';

export function EuropeMapLeaflet() {
  return (
    <div>
      <div css={css({ height: 300, '& > *': { height: '100%' } })}>
        <MapContainer center={[51.505, -0.09]} zoom={4} scrollWheelZoom={false}>
          <GeoJSON data={countriesGeo} />
        </MapContainer>
      </div>
    </div>
  );
}
