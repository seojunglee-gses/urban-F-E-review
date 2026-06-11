import type {
  BibliographicRecord,
  GeneratedCodebook,
  LLMClassification,
  NormalizedAbstractRecord,
  TopicCluster,
  TopicModelResult,
} from "../../types/literature";

const now = (): string => new Date().toISOString();

export const mockBibliographicRecords: BibliographicRecord[] = [
  {
    id: "WOS-MOCK-001",
    uid: "WOS:MOCK-001",
    title:
      "Compact urban form and residential cooling energy demand in high-density Asian districts",
    authors: ["Li Wei", "Marta Santamouris", "H. Chen"],
    year: 2014,
    journal: "Energy and Buildings",
    doi: "10.0000/mock.001",
    abstract:
      "This study links compact urban form, sky view factor and canyon geometry to measured residential cooling electricity in Hong Kong. Districts with lower sky view factor and higher nighttime heat retention show increased summer cooling demand despite reduced solar gains.",
    authorKeywords: [
      "urban form",
      "cooling energy",
      "sky view factor",
      "urban canyon",
    ],
    keywordsPlus: ["building energy", "urban heat island"],
    sourceDatabase: "Web of Science Mock",
    documentType: "Article",
    timesCited: 84,
    affiliations: ["University of Hong Kong, Hong Kong, China"],
    countries: ["China"],
    raw: { uid: "WOS:MOCK-001" },
  },
  {
    id: "WOS-MOCK-002",
    uid: "WOS:MOCK-002",
    title:
      "Local climate zones and building electricity use across European cities",
    authors: ["Elena Rossi", "Jonas Meyer"],
    year: 2018,
    journal: "Sustainable Cities and Society",
    doi: "10.0000/mock.002",
    abstract:
      "Using local climate zone mapping for London, Berlin and Milan, the paper compares electricity consumption intensity across compact mid-rise, open high-rise and low-rise land-cover classes. LCZ classes explain part of cooling and lighting electricity variability after controlling for income and building age.",
    authorKeywords: [
      "local climate zone",
      "electricity consumption",
      "urban morphology",
    ],
    keywordsPlus: ["Europe", "remote sensing", "energy demand"],
    sourceDatabase: "Web of Science Mock",
    documentType: "Article",
    timesCited: 51,
    affiliations: ["Technical University Berlin, Germany"],
    countries: ["Germany", "United Kingdom", "Italy"],
    raw: { uid: "WOS:MOCK-002" },
  },
  {
    id: "WOS-MOCK-003",
    uid: "WOS:MOCK-003",
    title:
      "Urban greenery, heat mitigation and cooling electricity reductions in Mediterranean neighborhoods",
    authors: ["A. García", "S. Papadopoulos"],
    year: 2020,
    journal: "Applied Energy",
    doi: "10.0000/mock.003",
    abstract:
      "Neighborhood-scale simulations in Barcelona and Athens indicate that tree canopy and irrigated green infrastructure reduce ambient temperature and cooling electricity demand during heat waves. Benefits depend on street orientation, canyon aspect ratio and irrigation assumptions.",
    authorKeywords: [
      "green infrastructure",
      "cooling demand",
      "urban heat island",
    ],
    keywordsPlus: ["microclimate", "ENVI-met", "Mediterranean"],
    sourceDatabase: "Web of Science Mock",
    documentType: "Article",
    timesCited: 67,
    affiliations: ["Universitat Politecnica de Catalunya, Spain"],
    countries: ["Spain", "Greece"],
    raw: { uid: "WOS:MOCK-003" },
  },
  {
    id: "WOS-MOCK-004",
    uid: "WOS:MOCK-004",
    title:
      "Density, transit accessibility and household transport energy tradeoffs in North American metropolitan areas",
    authors: ["Karen Smith", "Luis Hernández"],
    year: 2012,
    journal: "Journal of Transport Geography",
    doi: "10.0000/mock.004",
    abstract:
      "A statistical model of household travel surveys from New York, Toronto and Chicago shows that density and mixed land use reduce transport energy use, while larger multifamily shares modestly increase building electricity use. Net urban energy implications are context dependent.",
    authorKeywords: [
      "density",
      "transport energy",
      "land use mix",
      "urban form",
    ],
    keywordsPlus: ["metropolitan", "household travel"],
    sourceDatabase: "Web of Science Mock",
    documentType: "Article",
    timesCited: 96,
    affiliations: ["University of Toronto, Canada"],
    countries: ["Canada", "United States"],
    raw: { uid: "WOS:MOCK-004" },
  },
  {
    id: "WOS-MOCK-005",
    uid: "WOS:MOCK-005",
    title:
      "Three-dimensional building geometry effects on heating and cooling loads in cold climate cities",
    authors: ["Mikko Laine", "Sara Lindberg"],
    year: 2019,
    journal: "Building and Environment",
    doi: "10.0000/mock.005",
    abstract:
      "The paper couples 3D city models with building energy simulation in Stockholm and Helsinki. Compact block forms reduce winter heating demand through lower exposed surface area but may increase summer overheating and cooling loads in future climate scenarios.",
    authorKeywords: [
      "3D morphology",
      "building geometry",
      "heating energy",
      "cooling load",
    ],
    keywordsPlus: ["CityGML", "cold climate", "simulation"],
    sourceDatabase: "Web of Science Mock",
    documentType: "Article",
    timesCited: 42,
    affiliations: ["Aalto University, Finland"],
    countries: ["Finland", "Sweden"],
    raw: { uid: "WOS:MOCK-005" },
  },
  {
    id: "WOS-MOCK-006",
    uid: "WOS:MOCK-006",
    title:
      "Urban sprawl, building energy intensity and emissions: a systematic review",
    authors: ["Priya Raman", "Oliver Jones"],
    year: 2021,
    journal: "Renewable and Sustainable Energy Reviews",
    doi: "10.0000/mock.006",
    abstract:
      "This review synthesizes evidence on sprawl, compactness and urban energy emissions. The literature is dominated by North American transport energy studies, with fewer papers linking sprawl metrics to building heating and cooling demand in rapidly urbanizing regions.",
    authorKeywords: [
      "sprawl",
      "emissions",
      "systematic review",
      "urban energy",
    ],
    keywordsPlus: ["compact city", "transport"],
    sourceDatabase: "Web of Science Mock",
    documentType: "Review",
    timesCited: 73,
    affiliations: ["University College London, United Kingdom"],
    countries: ["United Kingdom"],
    raw: { uid: "WOS:MOCK-006" },
  },
  {
    id: "WOS-MOCK-007",
    uid: "WOS:MOCK-007",
    title:
      "Remote sensing indicators of land cover change and electricity peaks during urban heat events",
    authors: ["Mei Tan", "Joshua Miller"],
    year: 2023,
    journal: "Remote Sensing of Environment",
    doi: "10.0000/mock.007",
    abstract:
      "Satellite-derived impervious surface, vegetation fraction and land surface temperature are linked with utility feeder electricity peaks in Phoenix. Loss of vegetation and higher impervious cover correlate with higher cooling-related electricity demand during heat events.",
    authorKeywords: [
      "remote sensing",
      "land cover",
      "electricity peak",
      "cooling",
    ],
    keywordsPlus: ["utility bills", "urban heat"],
    sourceDatabase: "Web of Science Mock",
    documentType: "Article",
    timesCited: 17,
    affiliations: ["Arizona State University, United States"],
    countries: ["United States"],
    raw: { uid: "WOS:MOCK-007" },
  },
  {
    id: "WOS-MOCK-008",
    uid: "WOS:MOCK-008",
    title:
      "Street network configuration and district energy demand in walkable neighborhoods",
    authors: ["N. Ahmed", "Clara Martin"],
    year: 2016,
    journal: "Urban Climate",
    doi: "10.0000/mock.008",
    abstract:
      "The study examines street connectivity, block size and orientation for neighborhoods in Paris. Walkable grids reduce transport energy but orientation effects on solar access create mixed impacts on heating and cooling simulation outputs.",
    authorKeywords: [
      "street layout",
      "walkability",
      "district energy",
      "solar access",
    ],
    keywordsPlus: ["urban morphology", "simulation"],
    sourceDatabase: "Web of Science Mock",
    documentType: "Article",
    timesCited: 36,
    affiliations: ["Sorbonne University, France"],
    countries: ["France"],
    raw: { uid: "WOS:MOCK-008" },
  },
  {
    id: "WOS-MOCK-009",
    uid: "WOS:MOCK-009",
    title:
      "Urban meteorology inputs for archetype building energy models in tropical megacities",
    authors: ["Ravi Iyer", "Lin Zhang"],
    year: 2024,
    journal: "Energy",
    doi: "10.0000/mock.009",
    abstract:
      "Urban Weather Generator outputs for Singapore and Mumbai are coupled to archetype building energy models. Urban meteorology inputs increase cooling energy estimates relative to rural weather files, particularly in compact high-rise zones.",
    authorKeywords: [
      "urban meteorology",
      "building energy model",
      "tropical climate",
      "cooling",
    ],
    keywordsPlus: ["weather generator", "megacity"],
    sourceDatabase: "Web of Science Mock",
    documentType: "Article",
    timesCited: 8,
    affiliations: ["National University of Singapore, Singapore"],
    countries: ["Singapore", "India"],
    raw: { uid: "WOS:MOCK-009" },
  },
  {
    id: "WOS-MOCK-010",
    uid: "WOS:MOCK-010",
    title:
      "Machine learning of utility bills reveals nonlinear urban canopy effects on residential electricity",
    authors: ["Emily Carter", "Diego Silva"],
    year: 2022,
    journal: "Cities",
    doi: "10.0000/mock.010",
    abstract:
      "Gradient boosting models trained on parcel-scale utility bills in São Paulo identify nonlinear interactions among tree canopy, building height, density and electricity use. Cooling benefits from greenery are strongest in medium-density neighborhoods.",
    authorKeywords: [
      "machine learning",
      "utility bills",
      "tree canopy",
      "electricity use",
    ],
    keywordsPlus: ["nonlinear", "urban canopy"],
    sourceDatabase: "Web of Science Mock",
    documentType: "Article",
    timesCited: 24,
    affiliations: ["Universidade de São Paulo, Brazil"],
    countries: ["Brazil"],
    raw: { uid: "WOS:MOCK-010" },
  },
  {
    id: "WOS-MOCK-011",
    uid: "WOS:MOCK-011",
    title: "Building energy implications of urban canyon albedo interventions",
    authors: ["Hannah Berger", "Takeshi Mori"],
    year: 2015,
    journal: "Solar Energy",
    doi: "10.0000/mock.011",
    abstract:
      "Reflective pavement and facade albedo interventions are evaluated for Tokyo street canyons. Higher albedo lowers cooling demand in some buildings but increases reflected solar gains in others, producing mixed building electricity outcomes.",
    authorKeywords: [
      "albedo",
      "urban canyon",
      "cool roofs",
      "building electricity",
    ],
    keywordsPlus: ["Tokyo", "solar radiation"],
    sourceDatabase: "Web of Science Mock",
    documentType: "Article",
    timesCited: 58,
    affiliations: ["University of Tokyo, Japan"],
    countries: ["Japan"],
    raw: { uid: "WOS:MOCK-011" },
  },
  {
    id: "WOS-MOCK-012",
    uid: "WOS:MOCK-012",
    title:
      "Urban form, heat exposure and energy poverty in informal settlements",
    authors: ["Amina Ndlovu", "Peter Walsh"],
    year: 2025,
    journal: "Landscape and Urban Planning",
    doi: "10.0000/mock.012",
    abstract:
      "Field observations in Cape Town informal settlements connect compact layouts, low vegetation and poor envelope quality to high heat exposure and constrained cooling energy access. The study highlights planning implications for microclimate adaptation and energy equity.",
    authorKeywords: [
      "energy poverty",
      "informal settlements",
      "heat exposure",
      "urban form",
    ],
    keywordsPlus: ["adaptation", "microclimate"],
    sourceDatabase: "Web of Science Mock",
    documentType: "Article",
    timesCited: 2,
    affiliations: ["University of Cape Town, South Africa"],
    countries: ["South Africa"],
    raw: { uid: "WOS:MOCK-012" },
  },
];

export const buildMockTopicModel = (
  records: NormalizedAbstractRecord[],
): TopicModelResult => {
  const byId = new Set(records.map((record) => record.id));
  const clusters: TopicCluster[] = [
    {
      id: "topic-uhi-cooling",
      label: "Urban heat island and cooling electricity",
      description:
        "Studies connecting heat retention, land cover, albedo or urban meteorology to cooling electricity and peak demand.",
      keywords: [
        "urban heat island",
        "cooling demand",
        "electricity",
        "microclimate",
      ],
      representativeRecordIds: [
        "WOS-MOCK-001",
        "WOS-MOCK-003",
        "WOS-MOCK-007",
        "WOS-MOCK-009",
      ].filter((id) => byId.has(id)),
      urbanFormSignals: [
        "urban canyon",
        "green infrastructure",
        "impervious surface",
        "compact high-rise",
      ],
      energyOutcomeSignals: [
        "cooling demand",
        "electricity peak",
        "building energy model",
      ],
      mechanismSignals: [
        "heat retention",
        "evapotranspiration",
        "urban weather inputs",
      ],
      confidence: 0.88,
    },
    {
      id: "topic-morphology-building",
      label: "3D morphology and building energy simulation",
      description:
        "Papers using LCZ, 3D city models, canyon geometry and block form to simulate heating, cooling or electricity outcomes.",
      keywords: ["LCZ", "3D morphology", "building geometry", "simulation"],
      representativeRecordIds: [
        "WOS-MOCK-002",
        "WOS-MOCK-005",
        "WOS-MOCK-008",
        "WOS-MOCK-011",
      ].filter((id) => byId.has(id)),
      urbanFormSignals: [
        "local climate zones",
        "building geometry",
        "street orientation",
        "albedo",
      ],
      energyOutcomeSignals: [
        "heating energy",
        "cooling load",
        "building electricity",
      ],
      mechanismSignals: [
        "surface exposure",
        "solar access",
        "radiative exchange",
      ],
      confidence: 0.84,
    },
    {
      id: "topic-density-transport",
      label: "Density, compactness and cross-sector energy tradeoffs",
      description:
        "Evidence on density, sprawl, land-use mix and transit accessibility spanning building and transport energy tradeoffs.",
      keywords: ["density", "compactness", "transport energy", "sprawl"],
      representativeRecordIds: ["WOS-MOCK-004", "WOS-MOCK-006"].filter((id) =>
        byId.has(id),
      ),
      urbanFormSignals: ["density", "land use mix", "sprawl", "compactness"],
      energyOutcomeSignals: ["transport energy", "emissions", "urban energy"],
      mechanismSignals: [
        "travel behavior",
        "building typology",
        "accessibility",
      ],
      confidence: 0.81,
    },
    {
      id: "topic-empirical-equity",
      label: "Empirical consumption, heat exposure and energy equity",
      description:
        "Utility-bill and field-observation studies linking urban form to electricity, cooling access and energy poverty.",
      keywords: [
        "utility bills",
        "energy poverty",
        "machine learning",
        "heat exposure",
      ],
      representativeRecordIds: ["WOS-MOCK-010", "WOS-MOCK-012"].filter((id) =>
        byId.has(id),
      ),
      urbanFormSignals: ["tree canopy", "density", "informal settlements"],
      energyOutcomeSignals: [
        "electricity use",
        "cooling access",
        "energy equity",
      ],
      mechanismSignals: [
        "nonlinear canopy effects",
        "adaptive capacity",
        "envelope quality",
      ],
      confidence: 0.79,
    },
  ];

  return {
    id: `topic-model-${Date.now()}`,
    createdAt: now(),
    sourceRecordCount: records.length,
    clusters: clusters.filter(
      (cluster) => cluster.representativeRecordIds.length > 0,
    ),
    warnings: records.some((record) => record.abstract.length < 120)
      ? ["Some records have short abstracts; topic confidence may be lower."]
      : [],
    mockMode: true,
  };
};

const category = (
  id: string,
  label: string,
  definition: string,
  relatedTopicIds: string[],
) => ({
  id,
  label,
  definition,
  inclusionCriteria: [
    `Include abstracts explicitly discussing ${label.toLowerCase()}.`,
  ],
  exclusionCriteria: [
    "Exclude passing mentions without an energy or urban-form mechanism.",
  ],
  examples: [label],
  relatedTopicIds,
});

export const buildMockCodebook = (
  topicModel: TopicModelResult,
  sourceRecordCount: number,
): GeneratedCodebook => ({
  id: `codebook-${Date.now()}`,
  createdAt: now(),
  sourceRecordCount,
  dimensions: [
    {
      id: "urban-form-variable",
      name: "Urban form variable",
      description: "Observed or modeled spatial form attributes.",
      categories: [
        category(
          "density-compactness",
          "Density / compactness",
          "Population, built-form, or floor-area compactness metrics.",
          ["topic-density-transport"],
        ),
        category(
          "lcz-3d",
          "LCZ / 3D morphology",
          "Local climate zones, 3D geometry, canyon metrics and height/spacing measures.",
          ["topic-morphology-building"],
        ),
        category(
          "green-land-cover",
          "Green infrastructure / land cover",
          "Vegetation, impervious cover, albedo and surface composition.",
          ["topic-uhi-cooling", "topic-empirical-equity"],
        ),
      ],
    },
    {
      id: "energy-outcome",
      name: "Energy outcome",
      description: "Measured or modeled energy/emissions endpoint.",
      categories: [
        category(
          "cooling",
          "Cooling demand",
          "Cooling load, cooling electricity or peak cooling demand.",
          ["topic-uhi-cooling"],
        ),
        category(
          "heating",
          "Heating energy",
          "Heating load, winter demand or heat-loss-related outcomes.",
          ["topic-morphology-building"],
        ),
        category(
          "transport",
          "Transport energy",
          "Vehicle, household travel, transit or mobility energy.",
          ["topic-density-transport"],
        ),
        category(
          "emissions",
          "Emissions",
          "Operational carbon or urban energy-related emissions.",
          ["topic-density-transport"],
        ),
      ],
    },
    {
      id: "mechanism",
      name: "Mechanism",
      description: "Causal or explanatory urban climate/energy pathway.",
      categories: [
        category(
          "heat-retention",
          "Heat retention / UHI",
          "Urban heat storage and nighttime heat island pathways.",
          ["topic-uhi-cooling"],
        ),
        category(
          "solar-radiation",
          "Solar access / radiative exchange",
          "Shading, sky view factor, albedo and solar exposure pathways.",
          ["topic-morphology-building"],
        ),
        category(
          "accessibility",
          "Accessibility and travel behavior",
          "Mode choice, trip length and accessibility pathways.",
          ["topic-density-transport"],
        ),
      ],
    },
    {
      id: "relationship-type",
      name: "Relationship type",
      description: "Direction and shape of evidence relationship.",
      categories: [
        category(
          "positive",
          "Positive",
          "Urban form variable increases the energy outcome.",
          topicModel.clusters.map((cluster) => cluster.id),
        ),
        category(
          "negative",
          "Negative",
          "Urban form variable decreases the energy outcome.",
          topicModel.clusters.map((cluster) => cluster.id),
        ),
        category(
          "mixed",
          "Mixed / context-dependent",
          "Direction varies by climate, scale or sector.",
          topicModel.clusters.map((cluster) => cluster.id),
        ),
      ],
    },
    {
      id: "planning-implication",
      name: "Planning implication",
      description: "Policy or planning relevance inferred from the abstract.",
      categories: [
        category(
          "cooling-adaptation",
          "Cooling adaptation",
          "Urban heat mitigation and cooling demand management.",
          ["topic-uhi-cooling"],
        ),
        category(
          "compact-city-tradeoff",
          "Compact city tradeoff",
          "Balancing transport savings and building energy risks.",
          ["topic-density-transport"],
        ),
      ],
    },
    {
      id: "spatial-scale",
      name: "Spatial scale",
      description: "Primary analytical scale.",
      categories: [
        category(
          "building",
          "Building",
          "Building or parcel scale analysis.",
          [],
        ),
        category(
          "neighborhood",
          "Neighborhood",
          "Block, district or neighborhood scale analysis.",
          [],
        ),
        category(
          "city",
          "City / metropolitan",
          "City or metropolitan scale analysis.",
          [],
        ),
      ],
    },
    {
      id: "methodology",
      name: "Methodology",
      description: "Dominant analytical method.",
      categories: [
        category(
          "simulation",
          "Simulation",
          "Microclimate or building energy simulation.",
          [],
        ),
        category(
          "empirical",
          "Empirical / statistical",
          "Observed data, utility bills or statistical modeling.",
          [],
        ),
        category("review", "Review", "Literature review or synthesis.", []),
      ],
    },
    {
      id: "geography-context",
      name: "Geography/context",
      description: "Climate, region, or urban context.",
      categories: [
        category(
          "temperate",
          "Temperate/high-income cities",
          "Europe and North America-dominated evidence.",
          [],
        ),
        category(
          "hot-climate",
          "Hot or tropical cities",
          "Tropical, arid or Mediterranean heat contexts.",
          [],
        ),
      ],
    },
    {
      id: "sector",
      name: "Sector",
      description: "Energy sector represented.",
      categories: [
        category(
          "building",
          "Building energy",
          "Heating, cooling or electricity in buildings.",
          [],
        ),
        category(
          "transport",
          "Transport energy",
          "Mobility or household travel energy.",
          [],
        ),
        category("emissions", "Emissions", "Carbon or emissions outcomes.", []),
      ],
    },
  ],
  notes: [
    "Mock codebook derived from mock topic clusters for development only.",
    "Edit later: category merging and reviewer adjudication are future workflow steps.",
  ],
  warnings: [],
});

export const buildMockClassifications = (
  records: NormalizedAbstractRecord[],
): LLMClassification[] =>
  records.map((record) => {
    const text = record.normalizedText;
    const urbanFormVariables =
      text.includes("green") ||
      text.includes("vegetation") ||
      text.includes("canopy")
        ? ["Green infrastructure / land cover"]
        : text.includes("density") ||
            text.includes("compact") ||
            text.includes("sprawl")
          ? ["Density / compactness"]
          : text.includes("lcz") ||
              text.includes("3d") ||
              text.includes("canyon") ||
              text.includes("geometry")
            ? ["LCZ / 3D morphology"]
            : ["Urban morphology"];
    const energyOutcomes = text.includes("transport")
      ? ["Transport energy"]
      : text.includes("heating")
        ? ["Heating energy"]
        : text.includes("emission")
          ? ["Emissions"]
          : ["Cooling demand", "Electricity use"];
    return {
      recordId: record.id,
      urbanFormVariables,
      energyOutcomes,
      relationshipType:
        text.includes("mixed") || text.includes("tradeoff")
          ? "mixed"
          : text.includes("nonlinear")
            ? "nonlinear"
            : "context-dependent",
      mechanisms: text.includes("heat")
        ? ["Heat retention / UHI"]
        : ["Solar access / radiative exchange"],
      planningImplications: text.includes("transport")
        ? ["Compact city tradeoff"]
        : ["Cooling adaptation"],
      scale: text.includes("metropolitan")
        ? "metropolitan"
        : text.includes("building")
          ? "building"
          : text.includes("neighborhood")
            ? "neighborhood"
            : "city",
      methodology: text.includes("review")
        ? "review"
        : text.includes("machine learning")
          ? "machine-learning"
          : text.includes("simulation") || text.includes("model")
            ? "simulation"
            : "empirical-observational",
      geography:
        record.candidateLocations.length > 0
          ? record.candidateLocations
          : ["Unspecified"],
      climateContext: text.includes("tropical")
        ? "Tropical / hot-humid"
        : text.includes("cold")
          ? "Cold climate"
          : text.includes("mediterranean")
            ? "Mediterranean"
            : "Mixed or unspecified",
      sector: text.includes("transport")
        ? "transport-energy"
        : text.includes("emission")
          ? "emissions"
          : text.includes("heating")
            ? "building-heating"
            : "building-cooling",
      confidence: record.abstract.length > 180 ? 0.78 : 0.54,
      evidenceQuote: record.abstract.slice(0, 260),
      uncertaintyNotes:
        record.abstract.length > 180
          ? []
          : ["Short abstract limits classification certainty."],
    };
  });
