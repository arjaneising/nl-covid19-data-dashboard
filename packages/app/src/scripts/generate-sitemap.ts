/* eslint no-console: "off" */
import { assert } from '@corona-dashboard/common';
import sanityClient from '@sanity/client';
import dotenv from 'dotenv';
import fs from 'fs';
import globby from 'globby';
import path from 'path';
import prettier from 'prettier';
import { fileURLToPath } from 'url';
import { features } from '~/config/features';
import { gmData } from '~/data/gm';
import { vrData } from '~/data/vr';
import { logError } from '~/utils/logging';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: '../../.env.local' });

const disabledRoutes = features
  .filter((x) => x.isEnabled === false)
  .map((x) => x.route);

const vrCodes = vrData.map((x) => x.code);
const gmCodes = gmData.map((x) => x.gemcode);

const publicOutputDirectory = path.resolve(
  __dirname,
  '..', // src
  '..', // app
  'public'
);

async function main() {
  assert(
    process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
    'Missing NEXT_PUBLIC_SANITY_PROJECT_ID env var'
  );

  const config = {
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
    projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
    useCdn: process.env.NODE_ENV === 'production',
    apiVersion: '2021-03-25',
  };

  const locale = process.env.NEXT_PUBLIC_LOCALE || 'nl';

  const client = sanityClient(config);

  console.log(`Generating sitemap for locale '${locale}'`);

  const slugsQuery = `{
    'articles': *[_type == 'article'] {"slug":slug.current},
    'editorials': *[_type == 'editorial'] {"slug":slug.current},
  }`;

  const slugsData = (await client.fetch(slugsQuery)) as {
    articles: { slug: string }[];
    editorials: { slug: string }[];
  };

  const domain = `${
    process.env.NEXT_PUBLIC_LOCALE === 'en' ? 'government' : 'rijksoverheid'
  }`;

  // Ignore Next.js specific files and API routes.
  const pages = await globby([
    '../pages/**/*{.tsx,.mdx}',
    '!../pages/404.tsx',
    '!../pages/500.tsx',
    '!../pages/_*.tsx',
    '!../pages/api',
  ]);

  const pathsFromPages = pages
    .map((x) =>
      x
        .replace('../pages', '')
        .replace('.tsx', '')
        .replace('/index.tsx', '')
        .replace('/index', '')
    )
    .filter((x) => !disabledRoutes.includes(x));

  const priorities = [
    { path: 'landelijk', value: 0.8 },
    { path: 'gemeente', value: 0.8 },
    { path: 'regio', value: 0.8 },
  ];

  const pathsWithPriorities = pathsFromPages.map((path) => {
    const priority = priorities.find((priority) =>
      path.includes(priority.path)
    );

    return {
      path: path,
      priority: priority?.value ?? 0.6,
    };
  });

  const allPathsWithPriorities = pathsWithPriorities.filter(
    (p) => p.path !== '' && !isParameterizedPath(p.path)
  );
  const regioPaths = pathsWithPriorities.filter(
    (p) => isParameterizedPath(p.path) && p.path.includes('veiligheidsregio')
  );
  const gemeentePaths = pathsWithPriorities.filter(
    (p) => isParameterizedPath(p.path) && p.path.includes('gemeente')
  );
  const articlePaths = pathsWithPriorities.filter(
    (p) => isParameterizedPath(p.path) && p.path.includes('artikelen')
  );
  const editorialPaths = pathsWithPriorities.filter(
    (p) => isParameterizedPath(p.path) && p.path.includes('weekberichten')
  );

  articlePaths.forEach((p) => {
    slugsData.articles.forEach((article) => {
      const pathWithCode = p.path.replace('[slug]', article.slug);
      allPathsWithPriorities.push({ path: pathWithCode, priority: p.priority });
    });
  });

  editorialPaths.forEach((p) => {
    slugsData.editorials.forEach((editorial) => {
      const pathWithCode = p.path.replace('[slug]', editorial.slug);
      allPathsWithPriorities.push({ path: pathWithCode, priority: p.priority });
    });
  });

  regioPaths.forEach((p) => {
    vrCodes.forEach((code) => {
      const pathWithCode = p.path.replace('[code]', code);
      allPathsWithPriorities.push({ path: pathWithCode, priority: p.priority });
    });
  });

  gemeentePaths.forEach((p) => {
    gmCodes.forEach((code) => {
      const pathWithCode = p.path.replace('[code]', code);
      allPathsWithPriorities.push({ path: pathWithCode, priority: p.priority });
    });
  });

  const sitemap = `
    <?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
      xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
      <url>
        <loc>${`https://coronadashboard.${domain}.nl/`}</loc>
        <priority>1.00</priority>
      </url>
      ${allPathsWithPriorities
        .map(
          (p) => `
                <url>
                    <loc>${`https://coronadashboard.${domain}.nl${p.path}`}</loc>
                    <priority>${p.priority}</priority>
                </url>
            `
        )
        .join('')}
    </urlset>
  `;

  console.log('Writing sitemap to ', publicOutputDirectory, sitemap);

  fs.writeFileSync(
    path.join(publicOutputDirectory, 'sitemap.xml'),
    prettier.format(sitemap, { parser: 'html' })
  );
}

function isParameterizedPath(path: string) {
  return ['code', 'slug'].some((fragment) => path.includes(fragment));
}

main().then(
  () => process.exit(0),
  (err: Error) => {
    logError(err.message);
    process.exit(1);
  }
);
