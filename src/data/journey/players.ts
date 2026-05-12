// Curated NFL players (active or retired in the last ~5 years) who have
// played for at least 3 NFL teams. Team names match the CURRENT franchise
// display name in src/data/nfl/teams.json (so color lookups resolve), even
// when the player's stint predates a rebrand (e.g., Oakland → Las Vegas,
// Redskins → Commanders, St. Louis Rams → Los Angeles Rams).

export interface JourneyPlayer {
  id: string
  name: string
  position: string
  college: string
  teams: string[] // chronological: oldest stint first, current/last team last
}

export const JOURNEY_PLAYERS: JourneyPlayer[] = [
  // Quarterbacks
  {
    id: "journey:russell-wilson",
    name: "Russell Wilson",
    position: "QB",
    college: "Wisconsin",
    teams: ["Seattle Seahawks", "Denver Broncos", "Pittsburgh Steelers", "New York Giants"],
  },
  {
    id: "journey:sam-darnold",
    name: "Sam Darnold",
    position: "QB",
    college: "USC",
    teams: [
      "New York Jets",
      "Carolina Panthers",
      "San Francisco 49ers",
      "Minnesota Vikings",
      "Seattle Seahawks",
    ],
  },
  {
    id: "journey:baker-mayfield",
    name: "Baker Mayfield",
    position: "QB",
    college: "Oklahoma",
    teams: [
      "Cleveland Browns",
      "Carolina Panthers",
      "Los Angeles Rams",
      "Tampa Bay Buccaneers",
    ],
  },
  {
    id: "journey:geno-smith",
    name: "Geno Smith",
    position: "QB",
    college: "West Virginia",
    teams: [
      "New York Jets",
      "New York Giants",
      "Los Angeles Chargers",
      "Seattle Seahawks",
      "Las Vegas Raiders",
    ],
  },
  {
    id: "journey:justin-fields",
    name: "Justin Fields",
    position: "QB",
    college: "Ohio State",
    teams: ["Chicago Bears", "Pittsburgh Steelers", "New York Jets"],
  },
  {
    id: "journey:aaron-rodgers",
    name: "Aaron Rodgers",
    position: "QB",
    college: "California",
    teams: ["Green Bay Packers", "New York Jets", "Pittsburgh Steelers"],
  },
  {
    id: "journey:joe-flacco",
    name: "Joe Flacco",
    position: "QB",
    college: "Delaware",
    teams: [
      "Baltimore Ravens",
      "Denver Broncos",
      "New York Jets",
      "Cleveland Browns",
      "Indianapolis Colts",
    ],
  },
  {
    id: "journey:jameis-winston",
    name: "Jameis Winston",
    position: "QB",
    college: "Florida State",
    teams: [
      "Tampa Bay Buccaneers",
      "New Orleans Saints",
      "Cleveland Browns",
      "New York Giants",
    ],
  },
  {
    id: "journey:andy-dalton",
    name: "Andy Dalton",
    position: "QB",
    college: "TCU",
    teams: [
      "Cincinnati Bengals",
      "Dallas Cowboys",
      "Chicago Bears",
      "New Orleans Saints",
      "Carolina Panthers",
    ],
  },
  {
    id: "journey:kirk-cousins",
    name: "Kirk Cousins",
    position: "QB",
    college: "Michigan State",
    teams: ["Washington Commanders", "Minnesota Vikings", "Atlanta Falcons"],
  },
  {
    id: "journey:carson-wentz",
    name: "Carson Wentz",
    position: "QB",
    college: "North Dakota State",
    teams: [
      "Philadelphia Eagles",
      "Indianapolis Colts",
      "Washington Commanders",
      "Los Angeles Rams",
      "Kansas City Chiefs",
    ],
  },
  {
    id: "journey:mitchell-trubisky",
    name: "Mitchell Trubisky",
    position: "QB",
    college: "North Carolina",
    teams: ["Chicago Bears", "Buffalo Bills", "Pittsburgh Steelers"],
  },
  {
    id: "journey:teddy-bridgewater",
    name: "Teddy Bridgewater",
    position: "QB",
    college: "Louisville",
    teams: [
      "Minnesota Vikings",
      "New York Jets",
      "New Orleans Saints",
      "Carolina Panthers",
      "Denver Broncos",
      "Miami Dolphins",
      "Detroit Lions",
    ],
  },
  {
    id: "journey:ryan-fitzpatrick",
    name: "Ryan Fitzpatrick",
    position: "QB",
    college: "Harvard",
    teams: [
      "Cincinnati Bengals",
      "Buffalo Bills",
      "Tennessee Titans",
      "Houston Texans",
      "New York Jets",
      "Tampa Bay Buccaneers",
      "Miami Dolphins",
      "Washington Commanders",
    ],
  },
  {
    id: "journey:nick-foles",
    name: "Nick Foles",
    position: "QB",
    college: "Arizona",
    teams: [
      "Philadelphia Eagles",
      "Los Angeles Rams",
      "Kansas City Chiefs",
      "Jacksonville Jaguars",
      "Chicago Bears",
      "Indianapolis Colts",
    ],
  },
  {
    id: "journey:case-keenum",
    name: "Case Keenum",
    position: "QB",
    college: "Houston",
    teams: [
      "Houston Texans",
      "Los Angeles Rams",
      "Minnesota Vikings",
      "Denver Broncos",
      "Washington Commanders",
      "Cleveland Browns",
      "Buffalo Bills",
      "Chicago Bears",
    ],
  },
  {
    id: "journey:marcus-mariota",
    name: "Marcus Mariota",
    position: "QB",
    college: "Oregon",
    teams: [
      "Tennessee Titans",
      "Las Vegas Raiders",
      "Atlanta Falcons",
      "Philadelphia Eagles",
      "Washington Commanders",
    ],
  },

  // Wide Receivers
  {
    id: "journey:deandre-hopkins",
    name: "DeAndre Hopkins",
    position: "WR",
    college: "Clemson",
    teams: [
      "Houston Texans",
      "Arizona Cardinals",
      "Tennessee Titans",
      "Kansas City Chiefs",
      "Baltimore Ravens",
    ],
  },
  {
    id: "journey:davante-adams",
    name: "Davante Adams",
    position: "WR",
    college: "Fresno State",
    teams: [
      "Green Bay Packers",
      "Las Vegas Raiders",
      "New York Jets",
      "Los Angeles Rams",
    ],
  },
  {
    id: "journey:mike-williams",
    name: "Mike Williams",
    position: "WR",
    college: "Clemson",
    teams: ["Los Angeles Chargers", "New York Jets", "Pittsburgh Steelers"],
  },
  {
    id: "journey:stefon-diggs",
    name: "Stefon Diggs",
    position: "WR",
    college: "Maryland",
    teams: [
      "Minnesota Vikings",
      "Buffalo Bills",
      "Houston Texans",
      "New England Patriots",
    ],
  },
  {
    id: "journey:calvin-ridley",
    name: "Calvin Ridley",
    position: "WR",
    college: "Alabama",
    teams: ["Atlanta Falcons", "Jacksonville Jaguars", "Tennessee Titans"],
  },
  {
    id: "journey:brandin-cooks",
    name: "Brandin Cooks",
    position: "WR",
    college: "Oregon State",
    teams: [
      "New Orleans Saints",
      "New England Patriots",
      "Los Angeles Rams",
      "Houston Texans",
      "Dallas Cowboys",
    ],
  },
  {
    id: "journey:amari-cooper",
    name: "Amari Cooper",
    position: "WR",
    college: "Alabama",
    teams: [
      "Las Vegas Raiders",
      "Dallas Cowboys",
      "Cleveland Browns",
      "Buffalo Bills",
    ],
  },
  {
    id: "journey:antonio-brown",
    name: "Antonio Brown",
    position: "WR",
    college: "Central Michigan",
    teams: [
      "Pittsburgh Steelers",
      "Las Vegas Raiders",
      "New England Patriots",
      "Tampa Bay Buccaneers",
    ],
  },
  {
    id: "journey:desean-jackson",
    name: "DeSean Jackson",
    position: "WR",
    college: "California",
    teams: [
      "Philadelphia Eagles",
      "Washington Commanders",
      "Tampa Bay Buccaneers",
      "Las Vegas Raiders",
      "Los Angeles Rams",
      "Baltimore Ravens",
    ],
  },
  {
    id: "journey:jarvis-landry",
    name: "Jarvis Landry",
    position: "WR",
    college: "LSU",
    teams: ["Miami Dolphins", "Cleveland Browns", "New Orleans Saints"],
  },
  {
    id: "journey:robert-woods",
    name: "Robert Woods",
    position: "WR",
    college: "USC",
    teams: [
      "Buffalo Bills",
      "Los Angeles Rams",
      "Tennessee Titans",
      "Houston Texans",
    ],
  },
  {
    id: "journey:allen-robinson",
    name: "Allen Robinson II",
    position: "WR",
    college: "Penn State",
    teams: [
      "Jacksonville Jaguars",
      "Chicago Bears",
      "Los Angeles Rams",
      "Pittsburgh Steelers",
      "New York Giants",
      "Detroit Lions",
    ],
  },
  {
    id: "journey:odell-beckham-jr",
    name: "Odell Beckham Jr.",
    position: "WR",
    college: "LSU",
    teams: [
      "New York Giants",
      "Cleveland Browns",
      "Los Angeles Rams",
      "Baltimore Ravens",
      "Miami Dolphins",
    ],
  },
  {
    id: "journey:tyler-boyd",
    name: "Tyler Boyd",
    position: "WR",
    college: "Pittsburgh",
    teams: ["Cincinnati Bengals", "Tennessee Titans", "New York Jets"],
  },
  {
    id: "journey:emmanuel-sanders",
    name: "Emmanuel Sanders",
    position: "WR",
    college: "SMU",
    teams: [
      "Pittsburgh Steelers",
      "Denver Broncos",
      "San Francisco 49ers",
      "New Orleans Saints",
      "Buffalo Bills",
    ],
  },
  {
    id: "journey:golden-tate",
    name: "Golden Tate",
    position: "WR",
    college: "Notre Dame",
    teams: [
      "Seattle Seahawks",
      "Detroit Lions",
      "Philadelphia Eagles",
      "New York Giants",
      "Tennessee Titans",
    ],
  },
  {
    id: "journey:adam-thielen",
    name: "Adam Thielen",
    position: "WR",
    college: "Minnesota State",
    teams: ["Minnesota Vikings", "Carolina Panthers", "Indianapolis Colts"],
  },
  {
    id: "journey:keenan-allen",
    name: "Keenan Allen",
    position: "WR",
    college: "California",
    teams: ["Los Angeles Chargers", "Chicago Bears", "Las Vegas Raiders"],
  },

  // Running Backs
  {
    id: "journey:leveon-bell",
    name: "Le'Veon Bell",
    position: "RB",
    college: "Michigan State",
    teams: [
      "Pittsburgh Steelers",
      "New York Jets",
      "Kansas City Chiefs",
      "Baltimore Ravens",
      "Tampa Bay Buccaneers",
    ],
  },
  {
    id: "journey:adrian-peterson",
    name: "Adrian Peterson",
    position: "RB",
    college: "Oklahoma",
    teams: [
      "Minnesota Vikings",
      "New Orleans Saints",
      "Arizona Cardinals",
      "Washington Commanders",
      "Detroit Lions",
      "Tennessee Titans",
      "Seattle Seahawks",
    ],
  },
  {
    id: "journey:mark-ingram",
    name: "Mark Ingram II",
    position: "RB",
    college: "Alabama",
    teams: ["New Orleans Saints", "Baltimore Ravens", "Houston Texans"],
  },
  {
    id: "journey:latavius-murray",
    name: "Latavius Murray",
    position: "RB",
    college: "UCF",
    teams: [
      "Las Vegas Raiders",
      "Minnesota Vikings",
      "New Orleans Saints",
      "Baltimore Ravens",
      "Denver Broncos",
      "Buffalo Bills",
    ],
  },
  {
    id: "journey:melvin-gordon",
    name: "Melvin Gordon",
    position: "RB",
    college: "Wisconsin",
    teams: [
      "Los Angeles Chargers",
      "Denver Broncos",
      "Kansas City Chiefs",
      "Baltimore Ravens",
    ],
  },
  {
    id: "journey:james-conner",
    name: "James Conner",
    position: "RB",
    college: "Pittsburgh",
    teams: ["Pittsburgh Steelers", "Arizona Cardinals", "Houston Texans"],
  },
  {
    id: "journey:devonta-freeman",
    name: "Devonta Freeman",
    position: "RB",
    college: "Florida State",
    teams: [
      "Atlanta Falcons",
      "New York Giants",
      "Baltimore Ravens",
      "Cleveland Browns",
    ],
  },
  {
    id: "journey:kareem-hunt",
    name: "Kareem Hunt",
    position: "RB",
    college: "Toledo",
    teams: ["Kansas City Chiefs", "Cleveland Browns", "Los Angeles Chargers"],
  },
  {
    id: "journey:duke-johnson",
    name: "Duke Johnson",
    position: "RB",
    college: "Miami (FL)",
    teams: [
      "Cleveland Browns",
      "Houston Texans",
      "Miami Dolphins",
      "Buffalo Bills",
    ],
  },

  // Tight Ends
  {
    id: "journey:austin-hooper",
    name: "Austin Hooper",
    position: "TE",
    college: "Stanford",
    teams: [
      "Atlanta Falcons",
      "Cleveland Browns",
      "Tennessee Titans",
      "Las Vegas Raiders",
      "New England Patriots",
    ],
  },
  {
    id: "journey:jared-cook",
    name: "Jared Cook",
    position: "TE",
    college: "South Carolina",
    teams: [
      "Tennessee Titans",
      "Las Vegas Raiders",
      "Green Bay Packers",
      "New Orleans Saints",
      "Los Angeles Chargers",
      "Denver Broncos",
    ],
  },
  {
    id: "journey:jimmy-graham",
    name: "Jimmy Graham",
    position: "TE",
    college: "Miami (FL)",
    teams: [
      "New Orleans Saints",
      "Seattle Seahawks",
      "Green Bay Packers",
      "Chicago Bears",
      "New Orleans Saints",
    ],
  },
  {
    id: "journey:gerald-everett",
    name: "Gerald Everett",
    position: "TE",
    college: "South Alabama",
    teams: [
      "Los Angeles Rams",
      "Seattle Seahawks",
      "Los Angeles Chargers",
      "Chicago Bears",
    ],
  },
  {
    id: "journey:eric-ebron",
    name: "Eric Ebron",
    position: "TE",
    college: "North Carolina",
    teams: [
      "Detroit Lions",
      "Indianapolis Colts",
      "Pittsburgh Steelers",
    ],
  },
  {
    id: "journey:mohamed-sanu",
    name: "Mohamed Sanu",
    position: "WR",
    college: "Rutgers",
    teams: [
      "Cincinnati Bengals",
      "Atlanta Falcons",
      "New England Patriots",
      "San Francisco 49ers",
      "Miami Dolphins",
    ],
  },

  // Defensive players
  {
    id: "journey:khalil-mack",
    name: "Khalil Mack",
    position: "LB",
    college: "Buffalo",
    teams: ["Las Vegas Raiders", "Chicago Bears", "Los Angeles Chargers"],
  },
  {
    id: "journey:von-miller",
    name: "Von Miller",
    position: "LB",
    college: "Texas A&M",
    teams: [
      "Denver Broncos",
      "Los Angeles Rams",
      "Buffalo Bills",
      "Washington Commanders",
    ],
  },
  {
    id: "journey:jadeveon-clowney",
    name: "Jadeveon Clowney",
    position: "DE",
    college: "South Carolina",
    teams: [
      "Houston Texans",
      "Seattle Seahawks",
      "Tennessee Titans",
      "Cleveland Browns",
      "Baltimore Ravens",
      "Carolina Panthers",
    ],
  },
  {
    id: "journey:melvin-ingram",
    name: "Melvin Ingram",
    position: "LB",
    college: "South Carolina",
    teams: [
      "Los Angeles Chargers",
      "Pittsburgh Steelers",
      "Kansas City Chiefs",
      "Miami Dolphins",
    ],
  },
  {
    id: "journey:tyrann-mathieu",
    name: "Tyrann Mathieu",
    position: "S",
    college: "LSU",
    teams: [
      "Arizona Cardinals",
      "Houston Texans",
      "Kansas City Chiefs",
      "New Orleans Saints",
    ],
  },
  {
    id: "journey:richard-sherman",
    name: "Richard Sherman",
    position: "CB",
    college: "Stanford",
    teams: [
      "Seattle Seahawks",
      "San Francisco 49ers",
      "Tampa Bay Buccaneers",
    ],
  },
  {
    id: "journey:patrick-peterson",
    name: "Patrick Peterson",
    position: "CB",
    college: "LSU",
    teams: [
      "Arizona Cardinals",
      "Minnesota Vikings",
      "Pittsburgh Steelers",
    ],
  },
  {
    id: "journey:marcus-peters",
    name: "Marcus Peters",
    position: "CB",
    college: "Washington",
    teams: [
      "Kansas City Chiefs",
      "Los Angeles Rams",
      "Baltimore Ravens",
      "Las Vegas Raiders",
    ],
  },
  {
    id: "journey:stephon-gilmore",
    name: "Stephon Gilmore",
    position: "CB",
    college: "South Carolina",
    teams: [
      "Buffalo Bills",
      "New England Patriots",
      "Carolina Panthers",
      "Indianapolis Colts",
      "Dallas Cowboys",
      "Minnesota Vikings",
    ],
  },
  {
    id: "journey:chandler-jones",
    name: "Chandler Jones",
    position: "DE",
    college: "Syracuse",
    teams: [
      "New England Patriots",
      "Arizona Cardinals",
      "Las Vegas Raiders",
    ],
  },
  {
    id: "journey:hayden-hurst",
    name: "Hayden Hurst",
    position: "TE",
    college: "South Carolina",
    teams: [
      "Baltimore Ravens",
      "Atlanta Falcons",
      "Cincinnati Bengals",
      "Carolina Panthers",
      "Los Angeles Chargers",
    ],
  },
]

// Only offensive skill positions are eligible — mirrors the player Playerdle
// answer pool. Defensive players in JOURNEY_PLAYERS stay defined for possible
// future use but never become daily answers.
export const ELIGIBLE_POSITIONS: ReadonlyArray<string> = ["QB", "WR", "RB", "TE"]
const eligibleSet = new Set(ELIGIBLE_POSITIONS)

export const ELIGIBLE_JOURNEY_PLAYERS: JourneyPlayer[] = JOURNEY_PLAYERS.filter(p =>
  eligibleSet.has(p.position),
)

export function isEligiblePosition(position: string): boolean {
  return eligibleSet.has(position)
}

export function getJourneyPlayerById(id: string): JourneyPlayer | undefined {
  return JOURNEY_PLAYERS.find(p => p.id === id)
}

export function getJourneyPlayerByName(name: string): JourneyPlayer | undefined {
  const lower = name.toLowerCase()
  return JOURNEY_PLAYERS.find(p => p.name.toLowerCase() === lower)
}
