import dynamic from 'next/dynamic';
import Head from 'next/head';
import { Box } from '~/components/base';
import { EuropeChoropleth } from '~/components/choropleth/europe-choropleth';
import { RichContent } from '~/components/cms/rich-content';
import { EuropeMapVisxZoom } from '~/components/europe-map-visx-zoom';
import { Tile } from '~/components/tile';
import { Heading, Text } from '~/components/typography';
import { Content } from '~/domain/layout/content';
import { Layout } from '~/domain/layout/layout';
import { useIntl } from '~/intl';
import {
  createGetStaticProps,
  StaticProps,
} from '~/static-props/create-get-static-props';
import {
  createGetContent,
  getLastGeneratedDate,
} from '~/static-props/get-data';
import { RichContentBlock } from '~/types/cms';

const EuropeMapSimpleMaps = dynamic(
  () =>
    import('~/components/europe-map-simple-maps').then(
      (x) => x.EuropeMapSimpleMaps
    ),
  { ssr: false }
);

const EuropeMapLeaflet = dynamic(
  () =>
    import('~/components/europe-map-leaflet').then((x) => x.EuropeMapLeaflet),
  { ssr: false }
);

interface AccessibilityPageData {
  title: string | null;
  description: RichContentBlock[] | null;
}

export const getStaticProps = createGetStaticProps(
  getLastGeneratedDate,
  createGetContent<AccessibilityPageData>((_context) => {
    //@TODO We need to switch this from process.env to context as soon as we use i18n routing
    // const { locale } = context;
    const locale = process.env.NEXT_PUBLIC_LOCALE;

    return `*[_type == 'toegankelijkheid']{
      ...,
      "description": {
        ...,
        "_type": description._type,
        "${locale}": [
          ...description.${locale}[]{
            ...,
            "asset": asset->,
            markDefs[]{
              ...,
              "asset": asset->
            }
          }
        ]
      }
    }[0]
    `;
  })
);

const AccessibilityPage = (props: StaticProps<typeof getStaticProps>) => {
  const { siteText } = useIntl();
  const { content, lastGenerated } = props;

  return (
    <Layout
      {...siteText.toegankelijkheid_metadata}
      lastGenerated={lastGenerated}
    >
      <Head>
        <link
          key="dc-type"
          rel="dcterms:type"
          href="https://standaarden.overheid.nl/owms/terms/webpagina"
        />
        <link
          key="dc-type-title"
          rel="dcterms:type"
          href="https://standaarden.overheid.nl/owms/terms/webpagina"
          title="webpagina"
        />
      </Head>

      <Box
        width="100%"
        display="flex"
        alignItems="center"
        flexDirection="column"
      >
        <Box spacing={2} maxWidth={800} width="100%">
          <Tile>
            <Heading level={3}>Existing {`<Choropleth />`} component</Heading>
            <Text>
              supports SSR, probably our best bet for an mvp without pan/zoom
              UX.
            </Text>
            <EuropeChoropleth />
          </Tile>

          <Tile>
            <Heading level={3}>Visx + @visx/zoom</Heading>
            <Text>shitty touch behavior</Text>
            <EuropeMapVisxZoom />
          </Tile>
          <Tile>
            <Heading level={3}>React-simple-maps</Heading>
            <Text>
              SSR compilation errors, library not very well maintained. It does
              have OK interaction though. Might be worth it to fix the SSR
              issues with next-transpile-modules. Downside would be that we're
              using another library besides visx.
            </Text>
            <EuropeMapSimpleMaps />
          </Tile>
          <Tile>
            <Heading level={3}>Leaflet</Heading>
            <Text>
              Simply no SSR support, but by far the best support for mobile
            </Text>
            <EuropeMapLeaflet />
          </Tile>
        </Box>
      </Box>
      <Content>
        {content.title && <Heading level={1}>{content.title}</Heading>}
        {content.description && <RichContent blocks={content.description} />}
      </Content>
    </Layout>
  );
};

export default AccessibilityPage;
