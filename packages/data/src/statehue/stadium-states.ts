export interface StadiumEntry {
  name: string
  team: string
  league: "NFL" | "MLB" | "NBA" | "NHL"
  capacity: number
}

export interface StadiumState {
  id: string
  name: string
  stadiums: StadiumEntry[]
}

export const STADIUM_STATES: StadiumState[] = [
  {
    id: "AZ",
    name: "Arizona",
    stadiums: [
      { name: "State Farm Stadium", team: "Arizona Cardinals", league: "NFL", capacity: 63400 },
      { name: "Chase Field", team: "Arizona Diamondbacks", league: "MLB", capacity: 48686 },
      { name: "Footprint Center", team: "Phoenix Suns", league: "NBA", capacity: 18055 },
    ],
  },
  {
    id: "CA",
    name: "California",
    stadiums: [
      { name: "SoFi Stadium", team: "Los Angeles Rams / Chargers", league: "NFL", capacity: 70240 },
      { name: "Levi's Stadium", team: "San Francisco 49ers", league: "NFL", capacity: 68500 },
      { name: "Dodger Stadium", team: "Los Angeles Dodgers", league: "MLB", capacity: 56000 },
      { name: "Angel Stadium", team: "Los Angeles Angels", league: "MLB", capacity: 45517 },
      { name: "Oracle Park", team: "San Francisco Giants", league: "MLB", capacity: 41915 },
      { name: "Petco Park", team: "San Diego Padres", league: "MLB", capacity: 40209 },
      { name: "Crypto.com Arena", team: "Los Angeles Lakers / Kings", league: "NBA", capacity: 19379 },
      { name: "Chase Center", team: "Golden State Warriors", league: "NBA", capacity: 18064 },
      { name: "Intuit Dome", team: "Los Angeles Clippers", league: "NBA", capacity: 18000 },
      { name: "Golden 1 Center", team: "Sacramento Kings", league: "NBA", capacity: 17608 },
      { name: "Honda Center", team: "Anaheim Ducks", league: "NHL", capacity: 17174 },
      { name: "SAP Center", team: "San Jose Sharks", league: "NHL", capacity: 17562 },
    ],
  },
  {
    id: "CO",
    name: "Colorado",
    stadiums: [
      { name: "Empower Field at Mile High", team: "Denver Broncos", league: "NFL", capacity: 76125 },
      { name: "Coors Field", team: "Colorado Rockies", league: "MLB", capacity: 46897 },
      { name: "Ball Arena", team: "Denver Nuggets / Avalanche", league: "NBA", capacity: 19520 },
    ],
  },
  {
    id: "FL",
    name: "Florida",
    stadiums: [
      { name: "Hard Rock Stadium", team: "Miami Dolphins", league: "NFL", capacity: 65326 },
      { name: "Raymond James Stadium", team: "Tampa Bay Buccaneers", league: "NFL", capacity: 65618 },
      { name: "EverBank Stadium", team: "Jacksonville Jaguars", league: "NFL", capacity: 69132 },
      { name: "loanDepot park", team: "Miami Marlins", league: "MLB", capacity: 36742 },
      { name: "Tropicana Field", team: "Tampa Bay Rays", league: "MLB", capacity: 25025 },
      { name: "Kia Center", team: "Orlando Magic", league: "NBA", capacity: 18846 },
      { name: "Kaseya Center", team: "Miami Heat", league: "NBA", capacity: 19600 },
      { name: "Amalie Arena", team: "Tampa Bay Lightning", league: "NHL", capacity: 19092 },
      { name: "Amerant Bank Arena", team: "Florida Panthers", league: "NHL", capacity: 19250 },
    ],
  },
  {
    id: "GA",
    name: "Georgia",
    stadiums: [
      { name: "Mercedes-Benz Stadium", team: "Atlanta Falcons", league: "NFL", capacity: 71000 },
      { name: "Truist Park", team: "Atlanta Braves", league: "MLB", capacity: 41149 },
      { name: "State Farm Arena", team: "Atlanta Hawks", league: "NBA", capacity: 18118 },
    ],
  },
  {
    id: "IL",
    name: "Illinois",
    stadiums: [
      { name: "Soldier Field", team: "Chicago Bears", league: "NFL", capacity: 61500 },
      { name: "Wrigley Field", team: "Chicago Cubs", league: "MLB", capacity: 41649 },
      { name: "Guaranteed Rate Field", team: "Chicago White Sox", league: "MLB", capacity: 40615 },
      { name: "United Center", team: "Chicago Bulls / Blackhawks", league: "NBA", capacity: 20917 },
    ],
  },
  {
    id: "IN",
    name: "Indiana",
    stadiums: [
      { name: "Lucas Oil Stadium", team: "Indianapolis Colts", league: "NFL", capacity: 67000 },
      { name: "Gainbridge Fieldhouse", team: "Indiana Pacers", league: "NBA", capacity: 17923 },
    ],
  },
  {
    id: "LA",
    name: "Louisiana",
    stadiums: [
      { name: "Caesars Superdome", team: "New Orleans Saints", league: "NFL", capacity: 73208 },
      { name: "Smoothie King Center", team: "New Orleans Pelicans", league: "NBA", capacity: 16867 },
    ],
  },
  {
    id: "MA",
    name: "Massachusetts",
    stadiums: [
      { name: "Gillette Stadium", team: "New England Patriots", league: "NFL", capacity: 65878 },
      { name: "Fenway Park", team: "Boston Red Sox", league: "MLB", capacity: 37755 },
      { name: "TD Garden", team: "Boston Celtics / Bruins", league: "NBA", capacity: 19156 },
    ],
  },
  {
    id: "MD",
    name: "Maryland",
    stadiums: [
      { name: "M&T Bank Stadium", team: "Baltimore Ravens", league: "NFL", capacity: 71008 },
      { name: "Northwest Stadium", team: "Washington Commanders", league: "NFL", capacity: 65000 },
      { name: "Oriole Park at Camden Yards", team: "Baltimore Orioles", league: "MLB", capacity: 45971 },
    ],
  },
  {
    id: "MI",
    name: "Michigan",
    stadiums: [
      { name: "Ford Field", team: "Detroit Lions", league: "NFL", capacity: 65000 },
      { name: "Comerica Park", team: "Detroit Tigers", league: "MLB", capacity: 41083 },
      { name: "Little Caesars Arena", team: "Detroit Pistons / Red Wings", league: "NBA", capacity: 20491 },
    ],
  },
  {
    id: "MN",
    name: "Minnesota",
    stadiums: [
      { name: "U.S. Bank Stadium", team: "Minnesota Vikings", league: "NFL", capacity: 66860 },
      { name: "Target Field", team: "Minnesota Twins", league: "MLB", capacity: 38544 },
      { name: "Target Center", team: "Minnesota Timberwolves", league: "NBA", capacity: 18978 },
      { name: "Xcel Energy Center", team: "Minnesota Wild", league: "NHL", capacity: 17954 },
    ],
  },
  {
    id: "MO",
    name: "Missouri",
    stadiums: [
      { name: "GEHA Field at Arrowhead Stadium", team: "Kansas City Chiefs", league: "NFL", capacity: 76416 },
      { name: "Kauffman Stadium", team: "Kansas City Royals", league: "MLB", capacity: 37903 },
      { name: "Busch Stadium", team: "St. Louis Cardinals", league: "MLB", capacity: 44383 },
      { name: "Enterprise Center", team: "St. Louis Blues", league: "NHL", capacity: 19150 },
    ],
  },
  {
    id: "NC",
    name: "North Carolina",
    stadiums: [
      { name: "Bank of America Stadium", team: "Carolina Panthers", league: "NFL", capacity: 74867 },
      { name: "Spectrum Center", team: "Charlotte Hornets", league: "NBA", capacity: 19077 },
      { name: "PNC Arena", team: "Carolina Hurricanes", league: "NHL", capacity: 18680 },
    ],
  },
  {
    id: "NJ",
    name: "New Jersey",
    stadiums: [
      { name: "MetLife Stadium", team: "New York Giants / Jets", league: "NFL", capacity: 82500 },
      { name: "Prudential Center", team: "New Jersey Devils", league: "NHL", capacity: 16514 },
    ],
  },
  {
    id: "NV",
    name: "Nevada",
    stadiums: [
      { name: "Allegiant Stadium", team: "Las Vegas Raiders", league: "NFL", capacity: 65000 },
      { name: "T-Mobile Arena", team: "Vegas Golden Knights", league: "NHL", capacity: 17500 },
    ],
  },
  {
    id: "NY",
    name: "New York",
    stadiums: [
      { name: "Highmark Stadium", team: "Buffalo Bills", league: "NFL", capacity: 62000 },
      { name: "Yankee Stadium", team: "New York Yankees", league: "MLB", capacity: 46537 },
      { name: "Citi Field", team: "New York Mets", league: "MLB", capacity: 41922 },
      { name: "Madison Square Garden", team: "New York Knicks / Rangers", league: "NBA", capacity: 19812 },
      { name: "Barclays Center", team: "Brooklyn Nets", league: "NBA", capacity: 17732 },
      { name: "UBS Arena", team: "New York Islanders", league: "NHL", capacity: 17113 },
      { name: "KeyBank Center", team: "Buffalo Sabres", league: "NHL", capacity: 19070 },
    ],
  },
  {
    id: "OH",
    name: "Ohio",
    stadiums: [
      { name: "Huntington Bank Field", team: "Cleveland Browns", league: "NFL", capacity: 67431 },
      { name: "Paycor Stadium", team: "Cincinnati Bengals", league: "NFL", capacity: 65515 },
      { name: "Progressive Field", team: "Cleveland Guardians", league: "MLB", capacity: 34830 },
      { name: "Great American Ball Park", team: "Cincinnati Reds", league: "MLB", capacity: 42319 },
      { name: "Rocket Mortgage FieldHouse", team: "Cleveland Cavaliers", league: "NBA", capacity: 19432 },
      { name: "Nationwide Arena", team: "Columbus Blue Jackets", league: "NHL", capacity: 18500 },
    ],
  },
  {
    id: "OK",
    name: "Oklahoma",
    stadiums: [
      { name: "Paycom Center", team: "Oklahoma City Thunder", league: "NBA", capacity: 18203 },
    ],
  },
  {
    id: "OR",
    name: "Oregon",
    stadiums: [
      { name: "Moda Center", team: "Portland Trail Blazers", league: "NBA", capacity: 19980 },
    ],
  },
  {
    id: "PA",
    name: "Pennsylvania",
    stadiums: [
      { name: "Lincoln Financial Field", team: "Philadelphia Eagles", league: "NFL", capacity: 69796 },
      { name: "Acrisure Stadium", team: "Pittsburgh Steelers", league: "NFL", capacity: 68400 },
      { name: "Citizens Bank Park", team: "Philadelphia Phillies", league: "MLB", capacity: 43651 },
      { name: "PNC Park", team: "Pittsburgh Pirates", league: "MLB", capacity: 38362 },
      { name: "Wells Fargo Center", team: "Philadelphia 76ers / Flyers", league: "NBA", capacity: 20478 },
      { name: "PPG Paints Arena", team: "Pittsburgh Penguins", league: "NHL", capacity: 18387 },
    ],
  },
  {
    id: "TN",
    name: "Tennessee",
    stadiums: [
      { name: "Nissan Stadium", team: "Tennessee Titans", league: "NFL", capacity: 69143 },
      { name: "FedExForum", team: "Memphis Grizzlies", league: "NBA", capacity: 18119 },
      { name: "Bridgestone Arena", team: "Nashville Predators", league: "NHL", capacity: 17159 },
    ],
  },
  {
    id: "TX",
    name: "Texas",
    stadiums: [
      { name: "AT&T Stadium", team: "Dallas Cowboys", league: "NFL", capacity: 80000 },
      { name: "NRG Stadium", team: "Houston Texans", league: "NFL", capacity: 72220 },
      { name: "Globe Life Field", team: "Texas Rangers", league: "MLB", capacity: 40300 },
      { name: "Minute Maid Park", team: "Houston Astros", league: "MLB", capacity: 41168 },
      { name: "American Airlines Center", team: "Dallas Mavericks / Stars", league: "NBA", capacity: 19200 },
      { name: "Toyota Center", team: "Houston Rockets", league: "NBA", capacity: 18104 },
      { name: "Frost Bank Center", team: "San Antonio Spurs", league: "NBA", capacity: 18418 },
    ],
  },
  {
    id: "UT",
    name: "Utah",
    stadiums: [
      { name: "Delta Center", team: "Utah Jazz", league: "NBA", capacity: 18300 },
    ],
  },
  {
    id: "WA",
    name: "Washington",
    stadiums: [
      { name: "Lumen Field", team: "Seattle Seahawks", league: "NFL", capacity: 69000 },
      { name: "T-Mobile Park", team: "Seattle Mariners", league: "MLB", capacity: 47929 },
      { name: "Climate Pledge Arena", team: "Seattle Kraken", league: "NHL", capacity: 17151 },
    ],
  },
  {
    id: "WI",
    name: "Wisconsin",
    stadiums: [
      { name: "Lambeau Field", team: "Green Bay Packers", league: "NFL", capacity: 81441 },
      { name: "American Family Field", team: "Milwaukee Brewers", league: "MLB", capacity: 41900 },
      { name: "Fiserv Forum", team: "Milwaukee Bucks", league: "NBA", capacity: 17341 },
    ],
  },
]

export function getStadiumStateById(id: string): StadiumState | undefined {
  return STADIUM_STATES.find(s => s.id === id)
}

export function getAllStadiumStateNames(): string[] {
  return STADIUM_STATES.map(s => s.name)
}
