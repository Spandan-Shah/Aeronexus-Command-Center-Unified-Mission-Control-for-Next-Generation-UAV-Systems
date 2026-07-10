export type AhmedabadPoliceCategory =
  | "headquarters"
  | "territorial"
  | "women"
  | "traffic";

export type AhmedabadPoliceStation = {
  id: string;
  name: string;
  category: AhmedabadPoliceCategory;
  zone?: string;
  searchAliases: string[];
  coordinates?: [number, number]; // [longitude, latitude] only after manual verification
};

export const ahmedabadPoliceBounds = {
  south: 22.9,
  west: 72.44,
  north: 23.18,
  east: 72.75,
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function createStation(
  name: string,
  category: AhmedabadPoliceCategory,
  zone?: string,
  extraAliases: string[] = []
): AhmedabadPoliceStation {
  return {
    id: slugify(`${zone ?? category}-${name}`),
    name,
    category,
    zone,
    searchAliases: [
      name,
      `${name} Police Station`,
      `${name} Police Chowki`,
      `${name} Police Chowky`,
      `${name} PS`,
      ...extraAliases,
    ],
  };
}

const territorialZones = [
  {
    zone: "Zone 1",
    names: [
      "Sola",
      "Vastrapur",
      "Ghatlodia",
      "Navrangpura",
      "Naranpura",
      "Gujarat University",
      "Vadaj",
      "Sabarmati Riverfront West",
    ],
  },
  {
    zone: "Zone 2",
    names: [
      "Sabarmati",
      "Madhavpura",
      "Ranip",
      "Shahpur",
      "Karanj",
      "Chandkheda",
      "Sabarmati Riverfront East",
      "Motera",
      "Sabarmati East",
    ],
  },
  {
    zone: "Zone 3",
    names: ["Gaekwad Haveli", "Shaherkotda", "Kalupur", "Khadia"],
  },
  {
    zone: "Zone 4",
    names: [
      "Dariyapur",
      "Shahibaug",
      "Airport",
      "Meghaninagar",
      "Sardarnagar",
      "Naroda",
    ],
  },
  {
    zone: "Zone 5",
    names: [
      "Rakhial",
      "Bapunagar",
      "Krishnanagar",
      "Amraiwadi",
      "Khokhra",
      "Gomtipur",
    ],
  },
  {
    zone: "Zone 6",
    names: ["Maninagar", "Isanpur", "Kagdapith", "Danilimda", "Narol"],
  },
  {
    zone: "Zone 7",
    names: [
      "Ellisbridge",
      "Sarkhej",
      "Vasna",
      "Vejalpur",
      "Satellite",
      "Anandnagar",
      "Paldi",
      "Bodakdev",
    ],
  },
  {
    zone: "Zone 8",
    names: ["Vatva", "Vatva GIDC", "Ramol", "Odhav", "Nikol", "Vastral"],
  },
];

export const territorialPoliceStations: AhmedabadPoliceStation[] =
  territorialZones.flatMap((zone) =>
    zone.names.map((name) => createStation(name, "territorial", zone.zone))
  );

export const headquartersPoliceStations: AhmedabadPoliceStation[] = [
  createStation(
    "Office of the Commissioner of Police Ahmedabad City",
    "headquarters",
    "Headquarters",
    [
      "Commissioner of Police Ahmedabad",
      "Police Commissioner Office Ahmedabad",
      "Ahmedabad City Police Headquarters",
      "Ahmedabad Police HQ Shahibaug",
      "CP Ahmedabad Shahibaug",
    ]
  ),
];

export const womenPoliceStations: AhmedabadPoliceStation[] = [
  createStation("Mahila Police Station East", "women", "Women Cell", [
    "Women Police Station East Ahmedabad",
  ]),
  createStation("Mahila Police Station West", "women", "Women Cell", [
    "Women Police Station West Ahmedabad",
  ]),
];

const trafficStationNames = [
  "A Traffic Police Station",
  "B Traffic Police Station",
  "E Traffic Police Station",
  "F Traffic Police Station",
  "G Traffic Police Station",
  "H Traffic Police Station",
  "I Traffic Police Station",
  "J Traffic Police Station",
  "K Traffic Police Station",
  "L Traffic Police Station",
  "M Traffic Police Station",
  "N Traffic Police Station",
  "SG-1 Traffic Police Station",
  "SG-2 Traffic Police Station",
];

export const trafficPoliceStations: AhmedabadPoliceStation[] =
  trafficStationNames.map((name) =>
    createStation(name, "traffic", "Traffic Branch", [
      name.replace("Traffic Police Station", "Traffic Police"),
    ])
  );

export const officialAhmedabadPoliceStations: AhmedabadPoliceStation[] = [
  ...headquartersPoliceStations,
  ...territorialPoliceStations,
  ...womenPoliceStations,
  ...trafficPoliceStations,
];