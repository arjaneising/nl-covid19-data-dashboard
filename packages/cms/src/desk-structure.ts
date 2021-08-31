import { StructureBuilder as S } from '@sanity/structure';
import { BsCardChecklist, BsLockFill, BsMap, BsTable } from 'react-icons/bs';
import { GrCircleInformation, GrDashboard } from 'react-icons/gr';
import { MdQuestionAnswer } from 'react-icons/md';
import { RiPagesFill } from 'react-icons/ri';
import 'sanity-mobile-preview/dist/index.css?raw';
import { elementsListItem } from './elements/elements-list-item';
import { lokalizeListItem } from './lokalize/lokalize-list-item';

/**
 * This is a list of doc types we handle in the custom menu structure. All
 * others will appear automatically at the bottom.
 */
const hiddenDocTypes = [
  'siteSettings',
  'topicalPage',
  'veelgesteldeVragen',
  'veelgesteldeVragenGroups',
  'faqQuestion',
  'cijferVerantwoording',
  'cijferVerantwoordingGroups',
  'overDitDashboard',
  'overRisicoNiveaus',
  'roadmap',
  'lockdown',
  'behaviorPage',
  'deceasedPage',
  'situationsPage',
  'hospitalPage',
  'nursingHomePage',
  'elderlyAtHomePage',
  'infectiousPeoplePage',
  'disabilityCarePage',
  'intensiveCarePage',
  'positiveTestsPage',
  'in_positiveTestsPage',
  'in_variantsPage',
  'reproductionPage',
  'sewerPage',
  'vaccinationsPage',
  'variantsPage',
  'toegankelijkheid',
  'lokalizeSubject',
  'lokalizeString',
  'lokalizeText',
  'timeSeries',
  'timelineEvent',
  'contact',
  'cijferVerantwoordingItem',
  'media.tag',
];

export default () =>
  S.list()
    .title('Content')
    .items([
      lokalizeListItem(),
      elementsListItem(),
      S.listItem()
        .title('Lockdown en Routekaart')
        .icon(BsTable)
        .child(
          S.list()
            .title('Lockdown en Routekaart')
            .items([
              addListItem(BsLockFill, 'Lockdown', 'lockdown'),
              addListItem(BsTable, 'Routekaart', 'roadmap'),
            ])
        ),
      addListItem(
        GrCircleInformation,
        'Over dit dashboard',
        'overDitDashboard'
      ),
      addListItem(GrDashboard, 'Actueel', 'topicalPage'),
      addListItem(BsMap, 'Over de risiconiveaus', 'overRisicoNiveaus'),
      S.listItem()
        .title('Veelgestelde vragen')
        .icon(MdQuestionAnswer)
        .child(
          S.list()
            .title('Groepen en Vragen')
            .items([
              addListItem(
                MdQuestionAnswer,
                'Veelgestelde vragen pagina',
                'veelgesteldeVragen'
              ),
              ...S.documentTypeListItems().filter(
                (item) => item.getId() === 'veelgesteldeVragenGroups'
              ),
              ...S.documentTypeListItems().filter(
                (item) => item.getId() === 'faqQuestion'
              ),
            ])
        ),
      S.listItem()
        .title('Cijferverantwoording')
        .icon(BsCardChecklist)
        .child(
          S.list()
            .title('Groepen en Vragen')
            .items([
              addListItem(
                MdQuestionAnswer,
                'CijferVerantwoording pagina',
                'cijferVerantwoording'
              ),
              ...S.documentTypeListItems().filter(
                (item) => item.getId() === 'cijferVerantwoordingGroups'
              ),
              ...S.documentTypeListItems().filter(
                (item) => item.getId() === 'cijferVerantwoordingItem'
              ),
            ])
        ),

      S.listItem()
        .title('DIY Pages')
        .child(
          S.list()
            .title('Filters')
            .items([
              S.listItem()
                .title('All article pages')
                .child(
                  S.documentTypeList('articlePage')
                    .title('Article pages')
                    .child((documentId) => {
                      return S.documentList()
                        .title('Related items')
                        .filter(
                          '_type == "articlePageArticle" && page._ref == $documentId || _type == "articlePage" && page._id == $documentId'
                        )
                        .params({ documentId });
                    })
                ),
            ])
        ),

      S.listItem()
        .title('Article pages')
        .child(S.documentTypeList('articlePage').title('Article pages')),
      S.listItem()
        .title('Customized pages')
        .icon(BsTable)
        .child(
          S.list()
            .title('Customized pages')
            .items([
              addListItem(RiPagesFill, 'Vaccinaties', 'vaccinationsPage'),
              addListItem(
                GrCircleInformation,
                'Toegankelijkheid',
                'toegankelijkheid'
              ),
              addListItem(RiPagesFill, 'Contact', 'contact'),
            ])
        ),

      S.divider(),

      /**
       * Display all document types that haven't been handled in the structure
       * above.
       */
      ...S.documentTypeListItems().filter(
        (item) => !hiddenDocTypes.includes(item.getId() || '')
      ),
    ]);

function addListItem(
  icon: React.FC,
  title: string,
  schemaType: string,
  documentId = schemaType
) {
  return S.listItem()
    .title(title)
    .schemaType(schemaType)
    .icon(icon)
    .child(
      S.editor()
        .title(title)
        .schemaType(schemaType)
        .documentId(documentId)
        .views([S.view.form()])
    );
}
