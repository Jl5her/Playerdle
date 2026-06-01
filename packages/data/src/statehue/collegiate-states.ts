import type { ColorsState, ColorsTeam } from "./states"

const PALETTES: Record<string, [string, string, string]> = {
  // Texas
  Texas: ["#BF5700", "#FFFFFF", "#333F48"],
  "Texas A&M": ["#500000", "#FFFFFF", "#B0B0B0"],
  "Texas Tech": ["#CC0000", "#000000", "#FFFFFF"],
  Baylor: ["#154734", "#FFB81C", "#FFFFFF"],
  Houston: ["#C8102E", "#FFFFFF", "#76777B"],
  TCU: ["#4D1979", "#000000", "#FFFFFF"],
  SMU: ["#0033A0", "#C8102E", "#FFFFFF"],
  Rice: ["#00205B", "#B5B5B5", "#FFFFFF"],
  "North Texas": ["#00853E", "#000000", "#FFFFFF"],

  // North Carolina
  UNC: ["#4B9CD3", "#13294B", "#FFFFFF"],
  Duke: ["#003087", "#FFFFFF", "#000000"],
  "NC State": ["#CC0000", "#FFFFFF", "#000000"],
  "Wake Forest": ["#000000", "#9E7E38", "#FFFFFF"],
  "App State": ["#000000", "#FFCC00", "#FFFFFF"],
  Charlotte: ["#046A38", "#FFFFFF", "#000000"],
  Davidson: ["#B5121B", "#000000", "#FFFFFF"],
  "East Carolina": ["#4F2D7F", "#FAA21A", "#FFFFFF"],

  // California
  USC: ["#990000", "#FFCC00", "#FFFFFF"],
  UCLA: ["#2774AE", "#FFD100", "#FFFFFF"],
  Stanford: ["#8C1515", "#FFFFFF", "transparent"],
  Cal: ["#003262", "#FDB515", "#FFFFFF"],
  "San Diego State": ["#A6192E", "#000000", "#FFFFFF"],
  "Saint Mary's": ["#06315B", "#DA291C", "#FFFFFF"],
  "Fresno State": ["#C41230", "#002F65", "#FFFFFF"],
  "Cal Poly": ["#154734", "#C69214", "#FFFFFF"],
  "Long Beach State": ["#000000", "#F9A01B", "#FFFFFF"],
  "UC Santa Barbara": ["#003660", "#FEBC11", "#FFFFFF"],
  "UC Davis": ["#022851", "#B3A369", "#FFFFFF"],

  // Florida
  Florida: ["#FA4616", "#0021A5", "#FFFFFF"],
  "Florida State": ["#782F40", "#CEB888", "#FFFFFF"],
  Miami: ["#F47321", "#005030", "#FFFFFF"],
  UCF: ["#000000", "#FFCC00", "#FFFFFF"],
  "South Florida": ["#006747", "#CFC493", "#FFFFFF"],
  "Florida Atlantic": ["#003366", "#BC0007", "#FFFFFF"],
  "Florida Gulf Coast": ["#002D62", "#009B5B", "#FFFFFF"],
  Jacksonville: ["#004B87", "#BE9C35", "#FFFFFF"],
  Stetson: ["#006E51", "#B5A36A", "#FFFFFF"],

  // New York
  Syracuse: ["#F76900", "#000E54", "#FFFFFF"],
  "St. John's": ["#BA0C2F", "#FFFFFF", "#000000"],
  Buffalo: ["#005BBB", "#FFFFFF", "#000000"],
  Columbia: ["#B9D9EB", "#002060", "#FFFFFF"],
  Iona: ["#800000", "#C9B274", "#FFFFFF"],
  Army: ["#000000", "#C5B783", "#FFFFFF"],
  Niagara: ["#582C83", "#A8996E", "#FFFFFF"],
  Wagner: ["#003087", "#B5A36A", "#FFFFFF"],

  // Ohio
  "Ohio State": ["#BB0000", "#666666", "#FFFFFF"],
  Cincinnati: ["#E00122", "#000000", "#FFFFFF"],
  Xavier: ["#0C2340", "#898D8D", "#FFFFFF"],
  Dayton: ["#CE1126", "#002F87", "#FFFFFF"],
  Ohio: ["#00694E", "#FFFFFF", "#000000"],
  Akron: ["#002855", "#CDA962", "#FFFFFF"],
  "Cleveland State": ["#006747", "#FFFFFF", "#000000"],
  "Youngstown State": ["#CC0000", "#FFFFFF", "#000000"],

  // Pennsylvania
  "Penn State": ["#041E42", "#FFFFFF", "transparent"],
  Pitt: ["#003594", "#FFB81C", "#FFFFFF"],
  Villanova: ["#00205B", "#13B5EA", "#FFFFFF"],
  Temple: ["#9E1B32", "#FFFFFF", "#000000"],
  "Saint Joseph's": ["#A2002D", "#5D6770", "#FFFFFF"],
  Duquesne: ["#C8102E", "#003087", "#FFFFFF"],
  Penn: ["#011F5B", "#990000", "#FFFFFF"],
  Bucknell: ["#E87722", "#002B5C", "#FFFFFF"],
  "La Salle": ["#003DA5", "#D4AF37", "#FFFFFF"],

  // Virginia
  Virginia: ["#232D4B", "#F84C1E", "#FFFFFF"],
  "Virginia Tech": ["#630031", "#CF4420", "#FFFFFF"],
  VCU: ["#000000", "#F8B800", "#FFFFFF"],
  "James Madison": ["#450084", "#CBB677", "#FFFFFF"],
  "George Mason": ["#006633", "#FFCC33", "#FFFFFF"],
  "Old Dominion": ["#00507D", "#7BAFD4", "#FFFFFF"],
  "William & Mary": ["#115740", "#F0C040", "#000000"],
  Liberty: ["#002868", "#C41230", "#FFFFFF"],

  // Indiana
  Indiana: ["#990000", "#EEEDEB", "#FFFFFF"],
  Purdue: ["#000000", "#CFB991", "#FFFFFF"],
  "Notre Dame": ["#0C2340", "#C99700", "#AE9142"],
  Butler: ["#13294B", "#FFFFFF", "#000000"],
  "Indiana State": ["#0033A0", "#FFFFFF", "#000000"],
  "Ball State": ["#BA0C2F", "#FFFFFF", "#000000"],
  IUPUI: ["#990000", "#B5A36A", "#FFFFFF"],
  Valparaiso: ["#4D1979", "#D4AF37", "#FFFFFF"],

  // Massachusetts
  "Boston College": ["#8B0000", "#BC9B6A", "#FFFFFF"],
  Harvard: ["#A51C30", "#FFFFFF", "#000000"],
  UMass: ["#881C1C", "#FFFFFF", "#000000"],
  Northeastern: ["#C8102E", "#000000", "#FFFFFF"],
  "Boston University": ["#CC0000", "#FFFFFF", "#000000"],
  "Holy Cross": ["#602D89", "#FFFFFF", "#000000"],
  Merrimack: ["#002868", "#CE1126", "#FFFFFF"],
  Bryant: ["#000000", "#B5A36A", "#FFFFFF"],

  // Illinois
  Illinois: ["#E84A27", "#13294B", "#FFFFFF"],
  Northwestern: ["#4E2A84", "#FFFFFF", "#000000"],
  DePaul: ["#00205B", "#E31837", "#FFFFFF"],
  "Loyola Chicago": ["#8C2332", "#C8A748", "#FFFFFF"],
  "Illinois State": ["#CC0000", "#FFFFFF", "#000000"],
  "Northern Illinois": ["#C8102E", "#000000", "#FFFFFF"],
  UIC: ["#002147", "#E31837", "#FFFFFF"],
  Bradley: ["#CC0000", "#FFFFFF", "#000000"],
  "Southern Illinois": ["#6C0030", "#FFFFFF", "#000000"],

  // Iowa
  Iowa: ["#000000", "#FFCD00", "transparent"],
  "Iowa State": ["#C8102E", "#F1BE48", "#FFFFFF"],
  Drake: ["#004B98", "#FFFFFF", "#000000"],
  "Northern Iowa": ["#4C1A8F", "#FFCC00", "#FFFFFF"],

  // Kentucky
  Kentucky: ["#0033A0", "#FFFFFF", "#000000"],
  Louisville: ["#AD0000", "#000000", "#FFFFFF"],
  "Western Kentucky": ["#DA1F33", "#FFFFFF", "#000000"],
  "Murray State": ["#002147", "#FFC72C", "#FFFFFF"],
  "Morehead State": ["#002147", "#FFD200", "#FFFFFF"],
  "Eastern Kentucky": ["#8C1C13", "#FFFFFF", "#B09A5B"],
  Bellarmine: ["#003087", "#E8B500", "#FFFFFF"],

  // Louisiana
  LSU: ["#461D7C", "#FDD023", "#FFFFFF"],
  Tulane: ["#006747", "#418FDE", "#FFFFFF"],
  Louisiana: ["#CE181E", "#FFFFFF", "#000000"],
  "Louisiana Tech": ["#002F8B", "#CE0E2D", "#FFFFFF"],
  "Southeastern Louisiana": ["#006747", "#FFFFFF", "#000000"],
  McNeese: ["#003087", "#F0A500", "#FFFFFF"],
  "New Orleans": ["#002D62", "#FFFFFF", "#000000"],

  // Mississippi
  "Ole Miss": ["#CE1126", "#14213D", "#FFFFFF"],
  "Mississippi State": ["#5D1725", "#FFFFFF", "#898D8D"],
  "Southern Miss": ["#000000", "#FFAB00", "#FFFFFF"],
  "Jackson State": ["#002147", "#FFFFFF", "#000000"],
  "Mississippi Valley State": ["#00703C", "#FFFFFF", "#000000"],

  // Oklahoma
  Oklahoma: ["#841617", "#FDF9D8", "#FFFFFF"],
  "Oklahoma State": ["#FF7300", "#000000", "#FFFFFF"],
  Tulsa: ["#003366", "#DAA900", "#C8102E"],
  "Oral Roberts": ["#002956", "#DAA900", "#FFFFFF"],
  Lamar: ["#C8102E", "#FFFFFF", "#000000"],

  // South Carolina
  "South Carolina": ["#73000A", "#000000", "#FFFFFF"],
  Clemson: ["#F66733", "#522D80", "#FFFFFF"],
  "College of Charleston": ["#6D1F2C", "#ABA677", "#FFFFFF"],
  "Coastal Carolina": ["#006F71", "#876829", "#FFFFFF"],
  Winthrop: ["#C8102E", "#FFD700", "#FFFFFF"],
  "South Carolina State": ["#006E51", "#CC0000", "#FFFFFF"],

  // Tennessee
  Tennessee: ["#FF8200", "#FFFFFF", "#58595B"],
  Memphis: ["#003087", "#898D8D", "#FFFFFF"],
  Vanderbilt: ["#000000", "#866D4B", "#FFFFFF"],
  "Middle Tennessee": ["#0066CC", "#FFFFFF", "#000000"],
  ETSU: ["#041E42", "#FAB733", "#FFFFFF"],
  Belmont: ["#003DA5", "#A89968", "#FFFFFF"],
  "Tennessee State": ["#006E51", "#003087", "#FFFFFF"],
  "Tennessee Tech": ["#4C2C92", "#E8B500", "#FFFFFF"],
  "UT Martin": ["#FF8200", "#000E54", "#FFFFFF"],

  // Utah
  Utah: ["#CC0000", "#000000", "#FFFFFF"],
  BYU: ["#002E5D", "#FFFFFF", "#A7A8AA"],
  "Utah State": ["#003E7E", "#FFFFFF", "#8A8D8F"],
  "Weber State": ["#4E2A84", "#FFFFFF", "#000000"],
  "Southern Utah": ["#CC0000", "#002F6C", "#FFFFFF"],
  "Utah Valley": ["#006341", "#FFFFFF", "#A7A9AC"],

  // Alabama
  Alabama: ["#9E1B32", "#FFFFFF", "#000000"],
  Auburn: ["#0C2340", "#E87722", "#FFFFFF"],
  UAB: ["#1E6B52", "#F4C300", "#FFFFFF"],
  "South Alabama": ["#00205B", "#BF0D3E", "#FFFFFF"],
  Troy: ["#8A1538", "#B5A36A", "#FFFFFF"],
  Samford: ["#002D62", "#B07C35", "#FFFFFF"],
  "Jacksonville State": ["#CC0000", "#FFFFFF", "#000000"],
  Montevallo: ["#5B2D8E", "#F4C300", "#FFFFFF"],

  // Arizona
  Arizona: ["#CC0033", "#003366", "#FFFFFF"],
  "Arizona State": ["#8C1D40", "#FFC627", "#FFFFFF"],
  "Grand Canyon": ["#522398", "#FFFFFF", "#000000"],
  NAU: ["#002B5C", "#FFC627", "transparent"],

  // Colorado
  Colorado: ["#000000", "#CFB87C", "#FFFFFF"],
  "Colorado State": ["#1E4D2B", "#C8C372", "#FFFFFF"],
  "Air Force": ["#004A7B", "#8A8D8F", "#FFFFFF"],
  Denver: ["#8B2332", "#CBA052", "#FFFFFF"],
  "Colorado Mesa": ["#003DA5", "#CE1126", "#FFFFFF"],

  // Connecticut
  UConn: ["#000E2F", "#E4002B", "#FFFFFF"],
  Yale: ["#00356B", "#FFFFFF", "#000000"],
  Quinnipiac: ["#001E62", "#B58500", "#FFFFFF"],
  "Central Connecticut": ["#003087", "#1C85C7", "#FFFFFF"],
  "Sacred Heart": ["#CE1126", "#FFFFFF", "#000000"],
  Fairfield: ["#CC0000", "#FFFFFF", "#000000"],

  // Georgia
  Georgia: ["#BA0C2F", "#000000", "#FFFFFF"],
  "Georgia Tech": ["#B3A369", "#003057", "#FFFFFF"],
  "Georgia State": ["#0039A6", "#CC092F", "#FFFFFF"],
  "Georgia Southern": ["#003087", "#FFFFFF", "#B0AA7B"],
  Mercer: ["#F96302", "#002D72", "#FFFFFF"],
  "Kennesaw State": ["#FFCD00", "#000000", "#582C83"],
  "Georgia Court": ["#003087", "#C0A05B", "#FFFFFF"],

  // Kansas
  Kansas: ["#E8000D", "#0051BA", "#FFFFFF"],
  "Kansas State": ["#512888", "#A7A9AC", "#FFFFFF"],
  "Wichita State": ["#FDBB30", "#000000", "#FFFFFF"],
  "Fort Hays State": ["#000000", "#F4C300", "#FFFFFF"],
  Washburn: ["#004B8D", "#FFCC00", "#FFFFFF"],

  // Michigan
  Michigan: ["#FFCB05", "#00274C", "#FFFFFF"],
  "Michigan State": ["#18453B", "#FFFFFF", "#000000"],
  Oakland: ["#000000", "#DAA900", "#FFFFFF"],
  "Central Michigan": ["#6A0032", "#FFC82D", "#FFFFFF"],
  "Western Michigan": ["#6C4023", "#B5A36A", "#FFFFFF"],
  "Eastern Michigan": ["#006E51", "#000000", "#FFFFFF"],
  "Detroit Mercy": ["#002D62", "#C8102E", "#FFFFFF"],

  // Missouri
  Missouri: ["#000000", "#F1B82D", "#FFFFFF"],
  "Saint Louis": ["#003DA5", "#CCBE8E", "#FFFFFF"],
  "Missouri State": ["#5E0009", "#FFFFFF", "#898D8D"],
  "Kansas City": ["#0033A0", "#FFCD00", "#FFFFFF"],

  // New Jersey
  Rutgers: ["#CC0033", "#000000", "#FFFFFF"],
  "Seton Hall": ["#003ECC", "#898D8D", "#FFFFFF"],
  Princeton: ["#E77500", "#000000", "#FFFFFF"],
  Rider: ["#8C1515", "#FFFFFF", "#000000"],
  Monmouth: ["#003366", "#CCAB00", "#FFFFFF"],
  "Saint Peter's": ["#003087", "#C4AF4D", "#FFFFFF"],
  "Fairleigh Dickinson": ["#003087", "#B5A36A", "#FFFFFF"],

  // Rhode Island
  Providence: ["#000000", "#FFFFFF", "#A2AAAD"],
  "Rhode Island": ["#75B2DD", "#002147", "#FFFFFF"],
  Brown: ["#4E3629", "#ED1B2F", "#FFFFFF"],

  // Washington
  Washington: ["#4B2E83", "#B7A57A", "#FFFFFF"],
  "Washington State": ["#981E32", "#5E6A71", "#FFFFFF"],
  Gonzaga: ["#041E42", "#C8102E", "#FFFFFF"],
  "Eastern Washington": ["#A10022", "#FFFFFF", "#000000"],
  "Seattle U": ["#C41E3A", "#FFFFFF", "#000000"],
  "Western Washington": ["#003087", "#C4A430", "#FFFFFF"],
  "Central Washington": ["#CC0000", "#000000", "#FFFFFF"],

  // Oregon (new state)
  Oregon: ["#154733", "#FEE123", "#FFFFFF"],
  "Oregon State": ["#DC4405", "#000000", "#FFFFFF"],
  Portland: ["#582C83", "#F4CD00", "#FFFFFF"],
  "Portland State": ["#6E3796", "#FFFFFF", "#B5B5B5"],
  Pacific: ["#FF6600", "#000000", "#FFFFFF"],
  "Southern Oregon": ["#CC0000", "#000000", "#FFFFFF"],

  // Maryland (new state)
  Maryland: ["#E03A3E", "#FFD520", "#000000"],
  Towson: ["#E0A800", "#000000", "#FFFFFF"],
  "Morgan State": ["#00529F", "#F18B21", "#FFFFFF"],
  UMBC: ["#FFC906", "#000000", "#FFFFFF"],
  Navy: ["#00205B", "#B4A26A", "#FFFFFF"],
  "Loyola Maryland": ["#006341", "#B8A800", "#FFFFFF"],
  "Coppin State": ["#003087", "#FFD700", "#FFFFFF"],
  "Mount St. Mary's": ["#002D62", "#C8102E", "#FFFFFF"],

  // Nebraska (new state)
  Nebraska: ["#E41C38", "#FFFDD0", "transparent"],
  Creighton: ["#00539F", "#FFFFFF", "#002469"],
  "Nebraska-Omaha": ["#005DAA", "#F2A900", "#FFFFFF"],
  "Nebraska-Kearney": ["#003087", "#FAC800", "#FFFFFF"],

  // Arkansas (new state)
  Arkansas: ["#9D2235", "#FFFFFF", "transparent"],
  "Arkansas State": ["#CC0000", "#000000", "#FFFFFF"],
  "Little Rock": ["#C01933", "#002F6C", "#FFFFFF"],
  "Central Arkansas": ["#6C1D45", "#AFAFAF", "#FFFFFF"],
  "Arkansas-Pine Bluff": ["#000000", "#FFCD00", "#FFFFFF"],

  // West Virginia (new state)
  "West Virginia": ["#002855", "#EAAA00", "#FFFFFF"],
  Marshall: ["#00B140", "#000000", "#FFFFFF"],
  "WV Mountaineers": ["#002855", "#EAAA00", "#FFFFFF"],

  // Idaho (new state)
  "Boise State": ["#0033A0", "#D64309", "#FFFFFF"],
  Idaho: ["#97999B", "#C6A431", "transparent"],
  "Idaho State": ["#F47920", "#000000", "transparent"],

  // Wisconsin (new state)
  Wisconsin: ["#C5050C", "#FFFFFF", "transparent"],
  Marquette: ["#003366", "#FFCC00", "#FFFFFF"],
  "Wisconsin-Milwaukee": ["#000000", "#F9A01B", "#FFFFFF"],
  "Wisconsin-Green Bay": ["#006341", "#FFFFFF", "#000000"],

  // North Dakota
  "North Dakota State": ["#FFB81C", "#006646", "#FFFFFF"],
  "North Dakota": ["#009A44", "#FFFFFF", "#000000"],

  // South Dakota (new state — fixes the ND bug)
  "South Dakota State": ["#003594", "#FFCC00", "#FFFFFF"],
  "South Dakota": ["#CC0000", "#FFFFFF", "#000000"],
}

const CONFERENCES: Record<string, string> = {
  // SEC
  Alabama: "SEC",
  Arkansas: "SEC",
  Auburn: "SEC",
  Florida: "SEC",
  Georgia: "SEC",
  Kentucky: "SEC",
  LSU: "SEC",
  "Mississippi State": "SEC",
  Missouri: "SEC",
  "Ole Miss": "SEC",
  Oklahoma: "SEC",
  "South Carolina": "SEC",
  Tennessee: "SEC",
  Texas: "SEC",
  "Texas A&M": "SEC",
  Vanderbilt: "SEC",

  // Big Ten
  Illinois: "Big Ten",
  Indiana: "Big Ten",
  Iowa: "Big Ten",
  Maryland: "Big Ten",
  Michigan: "Big Ten",
  "Michigan State": "Big Ten",
  Minnesota: "Big Ten",
  Nebraska: "Big Ten",
  Northwestern: "Big Ten",
  "Ohio State": "Big Ten",
  Oregon: "Big Ten",
  "Penn State": "Big Ten",
  Purdue: "Big Ten",
  Rutgers: "Big Ten",
  UCLA: "Big Ten",
  USC: "Big Ten",
  Washington: "Big Ten",
  Wisconsin: "Big Ten",

  // ACC
  "Boston College": "ACC",
  Cal: "ACC",
  Clemson: "ACC",
  Duke: "ACC",
  "Florida State": "ACC",
  "Georgia Tech": "ACC",
  Louisville: "ACC",
  Miami: "ACC",
  "NC State": "ACC",
  "Notre Dame": "ACC",
  Pitt: "ACC",
  SMU: "ACC",
  Stanford: "ACC",
  Syracuse: "ACC",
  UNC: "ACC",
  Virginia: "ACC",
  "Virginia Tech": "ACC",
  "Wake Forest": "ACC",

  // Big 12
  Arizona: "Big 12",
  "Arizona State": "Big 12",
  Baylor: "Big 12",
  BYU: "Big 12",
  Cincinnati: "Big 12",
  Colorado: "Big 12",
  Houston: "Big 12",
  "Iowa State": "Big 12",
  Kansas: "Big 12",
  "Kansas State": "Big 12",
  "Oklahoma State": "Big 12",
  TCU: "Big 12",
  "Texas Tech": "Big 12",
  UCF: "Big 12",
  Utah: "Big 12",
  "West Virginia": "Big 12",

  // AAC
  Army: "AAC",
  Charlotte: "AAC",
  "East Carolina": "AAC",
  "Florida Atlantic": "AAC",
  Memphis: "AAC",
  "North Texas": "AAC",
  Rice: "AAC",
  "South Florida": "AAC",
  Temple: "AAC",
  Tulane: "AAC",
  Tulsa: "AAC",
  UAB: "AAC",
  "Wichita State": "AAC",

  // Sun Belt
  "App State": "Sun Belt",
  "Arkansas State": "Sun Belt",
  "Coastal Carolina": "Sun Belt",
  "Georgia State": "Sun Belt",
  "Georgia Southern": "Sun Belt",
  "James Madison": "Sun Belt",
  Louisiana: "Sun Belt",
  "Little Rock": "Sun Belt",
  Marshall: "Sun Belt",
  "Old Dominion": "Sun Belt",
  "South Alabama": "Sun Belt",
  "Southern Miss": "Sun Belt",
  Troy: "Sun Belt",

  // MAC
  Akron: "MAC",
  Buffalo: "MAC",
  "Central Michigan": "MAC",
  "Eastern Michigan": "MAC",
  "Northern Illinois": "MAC",
  Ohio: "MAC",
  "Western Michigan": "MAC",

  // Mountain West
  "Air Force": "Mountain West",
  "Boise State": "Mountain West",
  "Colorado State": "Mountain West",
  "Fresno State": "Mountain West",
  "San Diego State": "Mountain West",
  "Utah State": "Mountain West",

  // Conference USA
  "Louisiana Tech": "Conference USA",
  "Middle Tennessee": "Conference USA",
  "Western Kentucky": "Conference USA",

  // Big East
  Butler: "Big East",
  Creighton: "Big East",
  DePaul: "Big East",
  Marquette: "Big East",
  Providence: "Big East",
  "Seton Hall": "Big East",
  "St. John's": "Big East",
  UConn: "Big East",
  Villanova: "Big East",
  Xavier: "Big East",

  // Ivy League
  Brown: "Ivy League",
  Columbia: "Ivy League",
  Harvard: "Ivy League",
  Penn: "Ivy League",
  Princeton: "Ivy League",
  Yale: "Ivy League",

  // Patriot League
  "Boston University": "Patriot League",
  "Holy Cross": "Patriot League",
  "Loyola Maryland": "Patriot League",
  Navy: "Patriot League",

  // Atlantic 10
  Davidson: "Atlantic 10",
  Dayton: "Atlantic 10",
  Duquesne: "Atlantic 10",
  "George Mason": "Atlantic 10",
  "La Salle": "Atlantic 10",
  "Loyola Chicago": "Atlantic 10",
  "Rhode Island": "Atlantic 10",
  "Saint Joseph's": "Atlantic 10",
  "Saint Louis": "Atlantic 10",
  UMass: "Atlantic 10",
  VCU: "Atlantic 10",

  // Missouri Valley
  Belmont: "Missouri Valley",
  Drake: "Missouri Valley",
  "Eastern Kentucky": "Missouri Valley",
  "Illinois State": "Missouri Valley",
  "Indiana State": "Missouri Valley",
  "Missouri State": "Missouri Valley",
  "Morehead State": "Missouri Valley",
  "Murray State": "Missouri Valley",
  "Northern Iowa": "Missouri Valley",
  "Southern Illinois": "Missouri Valley",
  "UT Martin": "Missouri Valley",

  // West Coast Conference
  Gonzaga: "WCC",
  Portland: "WCC",
  "Saint Mary's": "WCC",
  "Seattle U": "WAC",

  // Big Sky
  "Eastern Washington": "Big Sky",
  Idaho: "Big Sky",
  "Idaho State": "Big Sky",
  NAU: "Big Sky",
  "Portland State": "Big Sky",
  "Southern Utah": "Big Sky",
  "Weber State": "Big Sky",

  // Summit League
  "North Dakota": "Summit League",
  "North Dakota State": "Summit League",
  "Oral Roberts": "Summit League",
  "South Dakota": "Summit League",
  "South Dakota State": "Summit League",
  "Nebraska-Omaha": "Summit League",
  Denver: "Summit League",

  // Horizon League
  "Ball State": "Horizon League",
  "Cleveland State": "Horizon League",
  "Detroit Mercy": "Horizon League",
  Oakland: "Horizon League",
  "Wisconsin-Green Bay": "Horizon League",
  "Wisconsin-Milwaukee": "Horizon League",

  // WAC
  "Grand Canyon": "WAC",
  "Utah Valley": "WAC",
  "Central Arkansas": "WAC",

  // CAA
  "College of Charleston": "CAA",
  Northeastern: "CAA",
  Towson: "CAA",
  "William & Mary": "CAA",

  // SWAC
  "Jackson State": "SWAC",
  "Alabama A&M": "SWAC",
  "Morgan State": "MEAC",
  UMBC: "America East",

  // SoCon
  ETSU: "SoCon",
  Mercer: "SoCon",
  Samford: "SoCon",

  // Big South
  Winthrop: "Big South",

  // MAAC
  Iona: "MAAC",
  Quinnipiac: "MAAC",
  Monmouth: "MAAC",
  Rider: "MAAC",
  "Saint Peter's": "MAAC",
  Fairfield: "MAAC",
  Niagara: "MAAC",
  Siena: "MAAC",

  // ASUN
  "Florida Gulf Coast": "ASUN",
  Jacksonville: "ASUN",
  "Jacksonville State": "ASUN",
  "Kennesaw State": "ASUN",
  Liberty: "ASUN",
  Stetson: "ASUN",

  // Pac-12 (post-2024 holdouts)
  "Washington State": "Pac-12",
  "Oregon State": "Pac-12",
}

function team(name: string): ColorsTeam {
  const colors = PALETTES[name]
  if (!colors) throw new Error(`Missing collegiate palette for ${name}`)
  const conference = CONFERENCES[name]
  if (!conference) throw new Error(`Missing conference for ${name}`)
  return { name, league: conference, colors }
}

export function getCollegiateTeamPalette(schoolName: string): [string, string, string] | undefined {
  return PALETTES[schoolName]
}

export const COLLEGIATE_STATES: ColorsState[] = [
  {
    id: "TX",
    name: "Texas",
    teams: [
      team("Texas"),
      team("Texas A&M"),
      team("Texas Tech"),
      team("Baylor"),
      team("Houston"),
      team("TCU"),
      team("SMU"),
      team("Rice"),
      team("North Texas"),
    ],
  },
  {
    id: "NC",
    name: "North Carolina",
    teams: [
      team("UNC"),
      team("Duke"),
      team("NC State"),
      team("Wake Forest"),
      team("App State"),
      team("Charlotte"),
      team("Davidson"),
      team("East Carolina"),
    ],
  },
  {
    id: "CA",
    name: "California",
    teams: [
      team("USC"),
      team("UCLA"),
      team("Stanford"),
      team("Cal"),
      team("San Diego State"),
      team("Saint Mary's"),
      team("Fresno State"),
    ],
  },
  {
    id: "FL",
    name: "Florida",
    teams: [
      team("Florida"),
      team("Florida State"),
      team("Miami"),
      team("UCF"),
      team("South Florida"),
      team("Florida Atlantic"),
      team("Florida Gulf Coast"),
    ],
  },
  {
    id: "NY",
    name: "New York",
    teams: [
      team("Syracuse"),
      team("St. John's"),
      team("Buffalo"),
      team("Columbia"),
      team("Iona"),
      team("Army"),
    ],
  },
  {
    id: "OH",
    name: "Ohio",
    teams: [
      team("Ohio State"),
      team("Cincinnati"),
      team("Xavier"),
      team("Dayton"),
      team("Ohio"),
      team("Akron"),
    ],
  },
  {
    id: "PA",
    name: "Pennsylvania",
    teams: [
      team("Penn State"),
      team("Pitt"),
      team("Villanova"),
      team("Temple"),
      team("Saint Joseph's"),
      team("Duquesne"),
    ],
  },
  {
    id: "VA",
    name: "Virginia",
    teams: [
      team("Virginia"),
      team("Virginia Tech"),
      team("VCU"),
      team("James Madison"),
      team("George Mason"),
      team("Old Dominion"),
      team("Liberty"),
    ],
  },
  {
    id: "IN",
    name: "Indiana",
    teams: [
      team("Indiana"),
      team("Purdue"),
      team("Notre Dame"),
      team("Butler"),
      team("Indiana State"),
      team("Ball State"),
    ],
  },
  {
    id: "MA",
    name: "Massachusetts",
    teams: [
      team("Boston College"),
      team("Harvard"),
      team("UMass"),
      team("Northeastern"),
      team("Boston University"),
      team("Holy Cross"),
    ],
  },
  {
    id: "IL",
    name: "Illinois",
    teams: [
      team("Illinois"),
      team("Northwestern"),
      team("DePaul"),
      team("Loyola Chicago"),
      team("Illinois State"),
      team("Northern Illinois"),
    ],
  },
  {
    id: "IA",
    name: "Iowa",
    teams: [team("Iowa"), team("Iowa State"), team("Drake"), team("Northern Iowa")],
  },
  {
    id: "KY",
    name: "Kentucky",
    teams: [
      team("Kentucky"),
      team("Louisville"),
      team("Western Kentucky"),
      team("Murray State"),
      team("Morehead State"),
      team("Eastern Kentucky"),
    ],
  },
  {
    id: "LA",
    name: "Louisiana",
    teams: [team("LSU"), team("Tulane"), team("Louisiana"), team("Louisiana Tech")],
  },
  {
    id: "MS",
    name: "Mississippi",
    teams: [
      team("Ole Miss"),
      team("Mississippi State"),
      team("Southern Miss"),
      team("Jackson State"),
    ],
  },
  {
    id: "OK",
    name: "Oklahoma",
    teams: [team("Oklahoma"), team("Oklahoma State"), team("Tulsa"), team("Oral Roberts")],
  },
  {
    id: "SC",
    name: "South Carolina",
    teams: [
      team("South Carolina"),
      team("Clemson"),
      team("College of Charleston"),
      team("Coastal Carolina"),
      team("Winthrop"),
    ],
  },
  {
    id: "TN",
    name: "Tennessee",
    teams: [
      team("Tennessee"),
      team("Memphis"),
      team("Vanderbilt"),
      team("Middle Tennessee"),
      team("ETSU"),
      team("Belmont"),
    ],
  },
  {
    id: "UT",
    name: "Utah",
    teams: [
      team("Utah"),
      team("BYU"),
      team("Utah State"),
      team("Weber State"),
      team("Southern Utah"),
      team("Utah Valley"),
    ],
  },
  {
    id: "AL",
    name: "Alabama",
    teams: [
      team("Alabama"),
      team("Auburn"),
      team("UAB"),
      team("South Alabama"),
      team("Troy"),
      team("Samford"),
      team("Jacksonville State"),
    ],
  },
  {
    id: "AZ",
    name: "Arizona",
    teams: [team("Arizona"), team("Arizona State"), team("Grand Canyon"), team("NAU")],
  },
  {
    id: "CO",
    name: "Colorado",
    teams: [team("Colorado"), team("Colorado State"), team("Air Force"), team("Denver")],
  },
  {
    id: "CT",
    name: "Connecticut",
    teams: [team("UConn"), team("Yale"), team("Quinnipiac")],
  },
  {
    id: "GA",
    name: "Georgia",
    teams: [
      team("Georgia"),
      team("Georgia Tech"),
      team("Georgia State"),
      team("Georgia Southern"),
      team("Mercer"),
      team("Kennesaw State"),
    ],
  },
  {
    id: "KS",
    name: "Kansas",
    teams: [team("Kansas"), team("Kansas State"), team("Wichita State")],
  },
  {
    id: "MI",
    name: "Michigan",
    teams: [
      team("Michigan"),
      team("Michigan State"),
      team("Oakland"),
      team("Central Michigan"),
      team("Western Michigan"),
      team("Eastern Michigan"),
      team("Detroit Mercy"),
    ],
  },
  {
    id: "MO",
    name: "Missouri",
    teams: [team("Missouri"), team("Saint Louis"), team("Missouri State")],
  },
  {
    id: "NJ",
    name: "New Jersey",
    teams: [
      team("Rutgers"),
      team("Seton Hall"),
      team("Princeton"),
      team("Rider"),
      team("Monmouth"),
      team("Saint Peter's"),
    ],
  },
  {
    id: "ND",
    name: "North Dakota",
    teams: [team("North Dakota State"), team("North Dakota")],
  },
  {
    id: "SD",
    name: "South Dakota",
    teams: [team("South Dakota State"), team("South Dakota")],
  },
  {
    id: "RI",
    name: "Rhode Island",
    teams: [team("Providence"), team("Rhode Island"), team("Brown")],
  },
  {
    id: "WA",
    name: "Washington",
    teams: [
      team("Washington"),
      team("Washington State"),
      team("Gonzaga"),
      team("Eastern Washington"),
      team("Seattle U"),
    ],
  },
  {
    id: "OR",
    name: "Oregon",
    teams: [team("Oregon"), team("Oregon State"), team("Portland"), team("Portland State")],
  },
  {
    id: "MD",
    name: "Maryland",
    teams: [
      team("Maryland"),
      team("Towson"),
      team("Morgan State"),
      team("UMBC"),
      team("Navy"),
      team("Loyola Maryland"),
    ],
  },
  {
    id: "NE",
    name: "Nebraska",
    teams: [team("Nebraska"), team("Creighton"), team("Nebraska-Omaha")],
  },
  {
    id: "AR",
    name: "Arkansas",
    teams: [
      team("Arkansas"),
      team("Arkansas State"),
      team("Little Rock"),
      team("Central Arkansas"),
    ],
  },
  {
    id: "ID",
    name: "Idaho",
    teams: [team("Boise State"), team("Idaho"), team("Idaho State")],
  },
  {
    id: "WI",
    name: "Wisconsin",
    teams: [
      team("Wisconsin"),
      team("Marquette"),
      team("Wisconsin-Milwaukee"),
      team("Wisconsin-Green Bay"),
    ],
  },
]
