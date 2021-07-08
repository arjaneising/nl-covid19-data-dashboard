import {
  NlGNumber,
  TimeframeOption,
  VrGNumber,
} from '@corona-dashboard/common';
import { ChartTile } from '~/components/chart-tile';
import { TimeSeriesChart } from '~/components/time-series-chart';
import { InlineText } from '~/components/typography';
import { useIntl } from '~/intl';
import { colors } from '~/style/theme';

interface GNumberBarChartTileProps {
  data: NlGNumber | VrGNumber;
  timeframeInitialValue?: TimeframeOption;
}

export function GNumberBarChartTile({
  data: __data,
  timeframeInitialValue = '5weeks',
}: GNumberBarChartTileProps) {
  const { formatPercentage, siteText } = useIntl();

  const text = siteText.g_number.bar_chart;

  const values = __data.values;
  const last_value = __data.last_value;

  return (
    <ChartTile
      title={text.title}
      description={text.description}
      timeframeInitialValue={timeframeInitialValue}
      metadata={{
        date: last_value.date_of_insertion_unix,
        source: text.bronnen,
      }}
    >
      <TimeSeriesChart
        accessibility={{
          key: 'g_number',
          features: ['keyboard_bar_chart'],
        }}
        values={values}
        timeframe={timeframeInitialValue}
        numGridLines={3}
        dataOptions={{
          isPercentage: true,
        }}
        seriesConfig={[
          {
            type: 'bar',
            metricProperty: 'g_number',
            label: 'G number',
            color: colors.red,
            negativeColor: colors.data.primary,
            fillOpacity: 1,
          },
        ]}
        formatTooltip={({ value }) => {
          return (
            <>
              <InlineText fontWeight="bold">
                {`${formatPercentage(Math.abs(value.g_number))}% `}
              </InlineText>
              {value.g_number > 0
                ? text.positive_descriptor
                : text.negative_descriptor}
            </>
          );
        }}
      />
    </ChartTile>
  );
}
