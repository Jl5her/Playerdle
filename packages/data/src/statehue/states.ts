export interface ColorsTeam {
  name: string
  // Pro: NFL/MLB/NBA/NHL. Collegiate: conference name (SEC, Big Ten, ACC, etc.).
  league: string
  colors: [string, string, string]
}

export interface ColorsState {
  id: string
  name: string
  teams: ColorsTeam[]
}

export const COLORS_STATES: ColorsState[] = [
  {
    id: "AZ",
    name: "Arizona",
    teams: [
      { name: "Arizona Cardinals", league: "NFL", colors: ["#97233F", "#000000", "#FFB612"] },
      { name: "Arizona Diamondbacks", league: "MLB", colors: ["#A71930", "#E3D4AD", "#000000"] },
      { name: "Phoenix Suns", league: "NBA", colors: ["#1D1160", "#E56020", "#F9AD1B"] },
    ],
  },
  {
    id: "CA",
    name: "California",
    teams: [
      { name: "San Francisco 49ers", league: "NFL", colors: ["#AA0000", "#B3995D", "#FFFFFF"] },
      { name: "Los Angeles Rams", league: "NFL", colors: ["#003594", "#FFA300", "#FFFFFF"] },
      { name: "Los Angeles Chargers", league: "NFL", colors: ["#0080C6", "#FFC20E", "#002244"] },
      { name: "Athletics", league: "MLB", colors: ["#003831", "#EFB21E", "#FFFFFF"] },
      { name: "Los Angeles Angels", league: "MLB", colors: ["#BA0021", "#003263", "#C4CED4"] },
      { name: "Los Angeles Dodgers", league: "MLB", colors: ["#005A9C", "#EF3E42", "#FFFFFF"] },
      { name: "San Francisco Giants", league: "MLB", colors: ["#FD5A1E", "#27251F", "#EFD19F"] },
      { name: "San Diego Padres", league: "MLB", colors: ["#2F241D", "#FFC425", "transparent"] },
      { name: "Golden State Warriors", league: "NBA", colors: ["#1D428A", "#FFC72C", "#FFFFFF"] },
      { name: "Los Angeles Lakers", league: "NBA", colors: ["#552583", "#FDB927", "#FFFFFF"] },
      { name: "LA Clippers", league: "NBA", colors: ["#C8102E", "#1D428A", "#FFFFFF"] },
      { name: "Sacramento Kings", league: "NBA", colors: ["#5A2D81", "#63727A", "#000000"] },
      { name: "Los Angeles Kings", league: "NHL", colors: ["#111111", "#A2AAAD", "#FFFFFF"] },
      { name: "Anaheim Ducks", league: "NHL", colors: ["#CF4520", "#B9975B", "#000000"] },
      { name: "San Jose Sharks", league: "NHL", colors: ["#006D75", "#EA7200", "#000000"] },
    ],
  },
  {
    id: "CO",
    name: "Colorado",
    teams: [
      { name: "Denver Broncos", league: "NFL", colors: ["#FB4F14", "#002244", "#FFFFFF"] },
      { name: "Colorado Rockies", league: "MLB", colors: ["#33006F", "#000000", "#C4CED4"] },
      { name: "Denver Nuggets", league: "NBA", colors: ["#0E2240", "#FEC524", "#8B2131"] },
      { name: "Colorado Avalanche", league: "NHL", colors: ["#6F263D", "#236192", "#A2AAAD"] },
    ],
  },
  {
    id: "FL",
    name: "Florida",
    teams: [
      { name: "Miami Dolphins", league: "NFL", colors: ["#008E97", "#FC4C02", "#005778"] },
      { name: "Jacksonville Jaguars", league: "NFL", colors: ["#006778", "#D7A22A", "#101820"] },
      { name: "Tampa Bay Buccaneers", league: "NFL", colors: ["#D50A0A", "#34302B", "#FF7900"] },
      { name: "Miami Marlins", league: "MLB", colors: ["#00A3E0", "#EF3340", "#000000"] },
      { name: "Tampa Bay Rays", league: "MLB", colors: ["#092C5C", "#8FBCE6", "#F5D130"] },
      { name: "Miami Heat", league: "NBA", colors: ["#98002E", "#F9A01B", "#000000"] },
      { name: "Orlando Magic", league: "NBA", colors: ["#0077C0", "#000000", "#C4CED4"] },
      { name: "Florida Panthers", league: "NHL", colors: ["#C8102E", "#041E42", "#B9975B"] },
      { name: "Tampa Bay Lightning", league: "NHL", colors: ["#002868", "#FFFFFF", "transparent"] },
    ],
  },
  {
    id: "GA",
    name: "Georgia",
    teams: [
      { name: "Atlanta Falcons", league: "NFL", colors: ["#A71930", "#000000", "#A5ACAF"] },
      { name: "Atlanta Braves", league: "MLB", colors: ["#CE1141", "#13274F", "#EAAA00"] },
      { name: "Atlanta Hawks", league: "NBA", colors: ["#E03A3E", "#C1D32F", "#26282A"] },
    ],
  },
  {
    id: "IL",
    name: "Illinois",
    teams: [
      { name: "Chicago Bears", league: "NFL", colors: ["#0B162A", "#C83803", "#FFFFFF"] },
      { name: "Chicago Cubs", league: "MLB", colors: ["#0E3386", "#CC3433", "#FFFFFF"] },
      { name: "Chicago White Sox", league: "MLB", colors: ["#27251F", "#FFFFFF", "#C4CED4"] },
      { name: "Chicago Bulls", league: "NBA", colors: ["#CE1141", "#000000", "#FFFFFF"] },
      { name: "Chicago Blackhawks", league: "NHL", colors: ["#CF0A2C", "#000000", "#FFD100"] },
    ],
  },
  {
    id: "MA",
    name: "Massachusetts",
    teams: [
      { name: "New England Patriots", league: "NFL", colors: ["#002244", "#C60C30", "#B0B7BC"] },
      { name: "Boston Red Sox", league: "MLB", colors: ["#BD3039", "#0C2340", "#FFFFFF"] },
      { name: "Boston Celtics", league: "NBA", colors: ["#007A33", "#BA9653", "#FFFFFF"] },
      { name: "Boston Bruins", league: "NHL", colors: ["#FFB81C", "#000000", "#FFFFFF"] },
    ],
  },
  {
    id: "MI",
    name: "Michigan",
    teams: [
      { name: "Detroit Lions", league: "NFL", colors: ["#0076B6", "#B0B7BC", "#000000"] },
      { name: "Detroit Tigers", league: "MLB", colors: ["#0C2340", "#FA4616", "#FFFFFF"] },
      { name: "Detroit Pistons", league: "NBA", colors: ["#C8102E", "#1D42BA", "#FFFFFF"] },
      { name: "Detroit Red Wings", league: "NHL", colors: ["#CE1126", "#FFFFFF", "transparent"] },
    ],
  },
  {
    id: "MN",
    name: "Minnesota",
    teams: [
      { name: "Minnesota Vikings", league: "NFL", colors: ["#4F2683", "#FFC62F", "#FFFFFF"] },
      { name: "Minnesota Twins", league: "MLB", colors: ["#002B5C", "#D31145", "#B9975B"] },
      { name: "Minnesota Timberwolves", league: "NBA", colors: ["#0C2340", "#236192", "#9EA2A2"] },
      { name: "Minnesota Wild", league: "NHL", colors: ["#154734", "#DDCBA4", "#A6192E"] },
    ],
  },
  {
    id: "MO",
    name: "Missouri",
    teams: [
      { name: "Kansas City Chiefs", league: "NFL", colors: ["#E31837", "#FFB81C", "#FFFFFF"] },
      { name: "St. Louis Cardinals", league: "MLB", colors: ["#C41E3A", "#0C2340", "#FEDB00"] },
      { name: "Kansas City Royals", league: "MLB", colors: ["#004687", "#BD9B60", "#FFFFFF"] },
      { name: "St. Louis Blues", league: "NHL", colors: ["#002F87", "#FCB514", "#041E42"] },
    ],
  },
  {
    id: "NY",
    name: "New York",
    teams: [
      { name: "Buffalo Bills", league: "NFL", colors: ["#00338D", "#C60C30", "#FFFFFF"] },
      { name: "New York Yankees", league: "MLB", colors: ["#0C2340", "#FFFFFF", "transparent"] },
      { name: "New York Mets", league: "MLB", colors: ["#002D72", "#FF5910", "#FFFFFF"] },
      { name: "New York Knicks", league: "NBA", colors: ["#006BB6", "#F58426", "#BEC0C2"] },
      { name: "Brooklyn Nets", league: "NBA", colors: ["#000000", "#FFFFFF", "transparent"] },
      { name: "New York Rangers", league: "NHL", colors: ["#0038A8", "#CE1126", "#FFFFFF"] },
      { name: "New York Islanders", league: "NHL", colors: ["#00539B", "#F47D30", "#FFFFFF"] },
      { name: "Buffalo Sabres", league: "NHL", colors: ["#002654", "#FCB514", "#C8102E"] },
    ],
  },
  {
    id: "NC",
    name: "North Carolina",
    teams: [
      { name: "Carolina Panthers", league: "NFL", colors: ["#0085CA", "#101820", "#BFC0BF"] },
      { name: "Charlotte Hornets", league: "NBA", colors: ["#1D1160", "#00788C", "#A1A1A4"] },
      { name: "Carolina Hurricanes", league: "NHL", colors: ["#CE1126", "#000000", "#A4A9AD"] },
    ],
  },
  {
    id: "OH",
    name: "Ohio",
    teams: [
      { name: "Cleveland Browns", league: "NFL", colors: ["#311D00", "#FF3C00", "#FFFFFF"] },
      { name: "Cincinnati Bengals", league: "NFL", colors: ["#FB4F14", "#000000", "#FFFFFF"] },
      { name: "Cleveland Guardians", league: "MLB", colors: ["#00385D", "#E50022", "#FFFFFF"] },
      { name: "Cincinnati Reds", league: "MLB", colors: ["#C6011F", "#000000", "#FFFFFF"] },
      { name: "Cleveland Cavaliers", league: "NBA", colors: ["#860038", "#041E42", "#FDBB30"] },
      { name: "Columbus Blue Jackets", league: "NHL", colors: ["#002654", "#CE1126", "#A4A9AD"] },
    ],
  },
  {
    id: "PA",
    name: "Pennsylvania",
    teams: [
      { name: "Pittsburgh Steelers", league: "NFL", colors: ["#FFB612", "#000000", "#C60C30"] },
      { name: "Philadelphia Eagles", league: "NFL", colors: ["#004C54", "#A5ACAF", "#000000"] },
      { name: "Pittsburgh Pirates", league: "MLB", colors: ["#FDB827", "#000000", "#FFFFFF"] },
      { name: "Philadelphia Phillies", league: "MLB", colors: ["#E81828", "#002D72", "#FFFFFF"] },
      { name: "Philadelphia 76ers", league: "NBA", colors: ["#006BB6", "#ED174C", "#002B5C"] },
      { name: "Pittsburgh Penguins", league: "NHL", colors: ["#000000", "#FCB514", "#FFFFFF"] },
      { name: "Philadelphia Flyers", league: "NHL", colors: ["#F74902", "#000000", "#FFFFFF"] },
    ],
  },
  {
    id: "TN",
    name: "Tennessee",
    teams: [
      { name: "Tennessee Titans", league: "NFL", colors: ["#4B92DB", "#0C2340", "#C8102E"] },
      { name: "Memphis Grizzlies", league: "NBA", colors: ["#12173F", "#5D76A9", "#F5B112"] },
      { name: "Nashville Predators", league: "NHL", colors: ["#FFB81C", "#041E42", "#FFFFFF"] },
    ],
  },
  {
    id: "TX",
    name: "Texas",
    teams: [
      { name: "Dallas Cowboys", league: "NFL", colors: ["#003594", "#869397", "#FFFFFF"] },
      { name: "Houston Texans", league: "NFL", colors: ["#03202F", "#A71930", "#FFFFFF"] },
      { name: "Texas Rangers", league: "MLB", colors: ["#003278", "#C0111F", "#FFFFFF"] },
      { name: "Houston Astros", league: "MLB", colors: ["#002D62", "#EB6E1F", "#F4911E"] },
      { name: "Dallas Mavericks", league: "NBA", colors: ["#00538C", "#002B5E", "#B8C4CA"] },
      { name: "Houston Rockets", league: "NBA", colors: ["#CE1141", "#000000", "#C4CED4"] },
      { name: "San Antonio Spurs", league: "NBA", colors: ["#000000", "#C4CED4", "#FFFFFF"] },
      { name: "Dallas Stars", league: "NHL", colors: ["#006847", "#8F8F8C", "#000000"] },
    ],
  },
  {
    id: "WA",
    name: "Washington",
    teams: [
      { name: "Seattle Seahawks", league: "NFL", colors: ["#002244", "#69BE28", "#A5ACAF"] },
      { name: "Seattle Mariners", league: "MLB", colors: ["#0C2C56", "#005C5C", "#C4CED4"] },
      { name: "Seattle Kraken", league: "NHL", colors: ["#001628", "#99D9D9", "#355464"] },
    ],
  },
  {
    id: "WI",
    name: "Wisconsin",
    teams: [
      { name: "Green Bay Packers", league: "NFL", colors: ["#203731", "#FFB612", "#FFFFFF"] },
      { name: "Milwaukee Brewers", league: "MLB", colors: ["#12284B", "#FFC52F", "#FFFFFF"] },
      { name: "Milwaukee Bucks", league: "NBA", colors: ["#00471B", "#EEE1C6", "#000000"] },
    ],
  },
]

export function getColorsStateById(id: string): ColorsState | undefined {
  return COLORS_STATES.find(state => state.id === id)
}

export function getAllColorsStateNames(): string[] {
  return COLORS_STATES.map(state => state.name)
}

export function getProTeamPalette(teamName: string): [string, string, string] | undefined {
  for (const state of COLORS_STATES) {
    const team = state.teams.find(t => t.name === teamName)
    if (team) return team.colors
  }
  return undefined
}
