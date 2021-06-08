import { localPoint } from '@visx/event';
import { Graticule, Mercator } from '@visx/geo';
import { Zoom } from '@visx/zoom';
import { memo } from 'react';
import * as topojson from 'topojson-client';
import worldTopoJson from '~/components/choropleth/ne_50m_admin_0_countries.topo.json';
import { colors } from '~/style/theme';
import { useResponsiveContainer } from '~/utils/use-responsive-container';

interface FeatureShape {
  type: 'Feature';
  id: string;
  geometry: { coordinates: [number, number][][]; type: 'Polygon' };
  properties: typeof worldTopoJson['objects']['ne_50m_admin_0_countries']['geometries'][number]['properties'];
}

const world = topojson.feature(
  worldTopoJson,
  worldTopoJson.objects.ne_50m_admin_0_countries
) as {
  type: 'FeatureCollection';
  features: FeatureShape[];
};

export function EuropeMapVisxZoom() {
  const { ResponsiveContainer, width, height } = useResponsiveContainer(
    300,
    300
  );

  const centerX = width / 2;
  const centerY = height / 2;

  return (
    <ResponsiveContainer>
      <Zoom
        width={width}
        height={height}
        transformMatrix={{
          scaleX: 0.1,
          scaleY: 0.1,
          translateX: centerX,
          translateY: centerY,
          skewX: 0,
          skewY: 0,
        }}
        wheelDelta={(event) =>
          -event.deltaY > 0
            ? { scaleX: 1.05, scaleY: 1.05 }
            : { scaleX: 0.95, scaleY: 0.95 }
        }
      >
        {(zoom) => (
          <div style={{ position: 'relative' }}>
            <svg width={width} height={height}>
              <g transform={zoom.toString()}>
                <Map />
              </g>

              <rect
                width={width}
                height={height}
                fill="transparent"
                onTouchStart={zoom.dragStart}
                onTouchMove={zoom.dragMove}
                onTouchEnd={zoom.dragEnd}
                onMouseDown={zoom.dragStart}
                onMouseMove={zoom.dragMove}
                onMouseUp={zoom.dragEnd}
                onMouseLeave={() => {
                  if (zoom.isDragging) zoom.dragEnd();
                }}
                onDoubleClick={(event) => {
                  const point = localPoint(event) || { x: 0, y: 0 };
                  zoom.scale({ scaleX: 2, scaleY: 2, point });
                }}
              />
            </svg>
          </div>
        )}
      </Zoom>
    </ResponsiveContainer>
  );
}

const Map = memo(function Map() {
  const scale = 10000;
  const center: [number, number] = [-2.2518, 53.8642];
  return (
    <Mercator<FeatureShape> data={world.features} scale={scale} center={center}>
      {(mercator) => (
        <g>
          <Graticule
            graticule={(g) => mercator.path(g) || ''}
            stroke="rgba(33,33,33,0.05)"
          />
          {mercator.features.map(({ path }, i) => (
            <path
              key={`map-feature-${i}`}
              d={path || ''}
              fill={colors.data.primary}
              stroke={'white'}
              strokeWidth={0.5}
            />
          ))}
        </g>
      )}
    </Mercator>
  );
});
