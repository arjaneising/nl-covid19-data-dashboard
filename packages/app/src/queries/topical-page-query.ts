import { GetStaticPropsContext } from 'next';

export function getTopicalPageQuery(context: GetStaticPropsContext) {
  const { locale } = context;

  return /* groq */ `{
    // Retrieve the latest 3 articles with the highlighted article filtered out:
    "showWeeklyHighlight": *[_type=='topicalPage']{
      showWeeklyHighlight,
    }[0].showWeeklyHighlight,
    'articles': *[_type == 'article' && !(_id == *[_type == 'topicalPage']{"i":highlightedArticle->{_id}}[0].i._id)] | order(publicationDate desc) {
      "title":title.${locale},
      slug,
      "summary":summary.${locale},
      "cover": {
        ...cover,
        "asset": cover.asset->
      }
    }[0..2],
    'weeklyHighlight': *[_type == 'editorial'] | order(publicationDate desc) {
      "title":title.${locale},
      slug,
      "summary":summary.${locale},
      publicationDate,
      "cover": {
        ...cover,
        "asset": cover.asset->
      }
    }[0],
    "highlights": *[_type=='topicalPage']{
      showWeeklyMessage,
      highlights[]{
        "title":title.${locale},
        "category": category.${locale},
        "label":label.${locale},
        href,
        "cover": {
          ...cover,
          "asset": cover.asset->  
        }
      }
    }[0].highlights
  }`;
}
