export const articles = [
  {
    slug: 'reading-a-fractional-property-listing',
    title: 'Reading a fractional property listing',
    description:
      'A considered guide to unit prices, funding progress, property documents and the questions a listing should help you answer.',
    author: { name: 'Estora', type: 'Organization' },
    publishedAt: '2026-10-08',
    updatedAt: '2026-10-08',
    heroImage: '/assets/estora-residences.webp',
    category: 'Property essentials',
    published: true,
    body: [
      {
        heading: 'Start with the property, then the fraction',
        paragraphs: [
          'Read the location, property type and description before looking at an indicative return. A city name alone says little about a building’s access, surroundings or suitability. Ask what the supporting records establish and what remains an assumption.',
          'A listing is a starting point for due diligence. Review on ESTORA is part of the demonstration workflow; it is not a certification of title, quality or future performance.',
        ],
      },
      {
        heading: 'Understand the unit economics',
        paragraphs: [
          'ESTORA divides each property into a fixed number of units. The unit price is the valuation divided by total units. Your proportional share is your active units divided by the property’s total units.',
          'The minimum investment is the unit price multiplied by the minimum purchasable units. Do not confuse the price of one unit with the listing’s minimum commitment. The detail page also shows available units and purchase limits.',
        ],
        list: [
          'Compare the valuation with the evidence offered for it.',
          'Check the minimum units, available units and ownership cap.',
          'Read the holding period as a plan, rather than a guaranteed exit date.',
        ],
      },
      {
        heading: 'Read funding as a state, not a recommendation',
        paragraphs: [
          'Funding progress reports units sold relative to total units. LIVE listings accept eligible investments; FUNDED means all units have been reserved. Funding completion does not establish that a property will appreciate.',
          'On ESTORA, the property can move into a holding period and an administrator can later record its sale. Final net sale proceeds are allocated by unit ownership after the applicable platform fee. Cancellation follows a separate refund workflow.',
        ],
      },
      {
        heading: 'Distinguish evidence from estimates',
        paragraphs: [
          'Expected appreciation and projected values are illustrative assumptions. They do not describe a promised future sale price. Review accessible property documents and ask the listing owner about gaps or inconsistencies; document access follows the platform’s permissions.',
          'Consider valuation uncertainty, concentration, costs and a delayed sale. ESTORA does not provide secondary trading or rental distributions, so neither should be assumed when evaluating a listing.',
        ],
      },
      {
        heading: 'Know the demonstration boundary',
        paragraphs: [
          'ESTORA is an academic project using test funds and labelled mock payments. Identity verification uses dummy documents only. Investors must complete the platform’s verification workflow before committing test funds.',
          'Explore the marketplace and education guide before making a scenario. A calculator can help you interrogate an assumption; it cannot verify a property or predict an outcome.',
        ],
      },
    ],
    related: [
      'understanding-real-estate-roi-assumptions',
      'rental-yield-and-the-costs-behind-it',
    ],
  },
  {
    slug: 'understanding-real-estate-roi-assumptions',
    title: 'Understanding real estate ROI assumptions',
    description:
      'Separate the cash you put in, the proceeds you receive and the timing assumptions hidden in an annualized return.',
    author: { name: 'Estora', type: 'Organization' },
    publishedAt: '2026-10-08',
    updatedAt: '2026-10-08',
    heroImage: '/assets/estora-residences.webp',
    category: 'Investment thinking',
    published: true,
    body: [
      {
        heading: 'Define what the calculation includes',
        paragraphs: [
          'A useful scenario starts with consistent cash amounts. Initial investment is your starting outlay. Expenses are additional costs you choose to include. Sale value and received rent are proceeds. Avoid entering a cost twice or treating an expected receipt as money already earned.',
          'Our educational calculator uses total investment = initial investment + expenses. Total gain = sale value + received rent − total investment. Total ROI is total gain divided by total investment, expressed as a percentage.',
        ],
      },
      {
        heading: 'Keep assumptions visible',
        paragraphs: [
          'A higher assumed sale value will create a higher calculated return. That is a consequence of the input, not independent evidence of likely appreciation. Try a lower sale value, higher costs or a longer holding period to see the dependence.',
          'Zero sale proceeds and zero rent produce a 100% loss in this simplified model. Negative returns are valid results and should remain visible.',
        ],
        list: [
          'Include only costs and proceeds that fit the same scenario.',
          'State whether sale value is before or after a fee; do not count the fee twice.',
          'Compare an optimistic assumption with a flat or declining sale value.',
        ],
      },
      {
        heading: 'Annualized is not a cash-flow model',
        paragraphs: [
          'The annualized approximation treats every receipt as arriving at the end of the holding period. It takes the ratio of proceeds to total investment to the power of one divided by holding years, then subtracts one.',
          'This is not an internal rate of return calculation. Rent received periodically, extra investments during the holding period and dated withdrawals need a cash-flow model that includes those dates. The simplified result cannot represent their timing.',
        ],
      },
      {
        heading: 'Relate a scenario to ESTORA carefully',
        paragraphs: [
          'ESTORA’s investment lifecycle uses proportional units and a final sale payout after the platform fee. It does not distribute rent. A general real estate calculator can include rental receipts, but that input should not be read as an ESTORA feature.',
          'Expected appreciation displayed on a property is a projection. Actual sale proceeds, fees and unit ownership determine the demonstration payout. Nothing in this educational scenario changes a wallet or executes an investment.',
        ],
      },
    ],
    related: [
      'reading-a-fractional-property-listing',
      'rental-yield-and-the-costs-behind-it',
    ],
  },
  {
    slug: 'rental-yield-and-the-costs-behind-it',
    title: 'Rental yield and the costs behind it',
    description:
      'Understand gross and net yield, annualize rent consistently and keep expenses in view.',
    author: { name: 'Estora', type: 'Organization' },
    publishedAt: '2026-10-08',
    updatedAt: '2026-10-08',
    heroImage: '/assets/estora-residences.webp',
    category: 'The numbers',
    published: true,
    body: [
      {
        heading: 'Use a consistent rent period',
        paragraphs: [
          'Rental yield compares a year of rental receipts with a property value. A monthly amount must be multiplied by 12 before it is compared with the value. Enter either monthly or annual rent, never both for the same receipts.',
          'Multiplying a monthly assumption by 12 assumes the same rent is received for every month. If your scenario includes vacancy or uneven receipts, choose annual rent and enter the total you intend to model.',
        ],
      },
      {
        heading: 'Gross yield is only the first view',
        paragraphs: [
          'Gross annual yield is annual rental income divided by property value, multiplied by 100. It leaves operating expenses out of the numerator. A property with an attractive gross figure may have a much lower net figure.',
          'Net yield in our calculator subtracts the annual expenses you enter from annual rental income before dividing by property value. It is only as complete as your expense assumptions.',
        ],
        list: [
          'Consider maintenance and management costs relevant to the scenario.',
          'Include expected non-recoverable costs without double counting.',
          'Keep financing and tax assumptions explicit; this tool does not calculate them for you.',
        ],
      },
      {
        heading: 'A negative net yield is informative',
        paragraphs: [
          'Expenses can exceed rent. In that case, the simplified net yield is negative even when gross yield is positive. A zero rent input is also valid; the calculator should expose the result rather than hide it.',
          'Yield does not measure appreciation or the return on a later sale. Comparing a rental yield with a total return figure without checking what each includes can be misleading.',
        ],
      },
      {
        heading: 'Keep the platform scope clear',
        paragraphs: [
          'This is general real estate education. ESTORA does not distribute rental income, offer secondary trading or accept real payments. Its academic demonstration tracks unit purchases and proportional net proceeds when an administrator records a sale.',
          'Use the rental yield calculator to explore your own assumptions. For an ESTORA listing, read the property detail, lifecycle, costs and projection disclosures instead of assuming a rental payout.',
        ],
      },
    ],
    related: [
      'understanding-real-estate-roi-assumptions',
      'reading-a-fractional-property-listing',
    ],
  },
];
