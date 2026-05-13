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
  Stanford: ["#8C1515", "#FFFFFF", "#2E2D29"],
  Cal: ["#003262", "#FDB515", "#FFFFFF"],
  "San Diego State": ["#A6192E", "#000000", "#FFFFFF"],
  "Saint Mary's": ["#06315B", "#DA291C", "#FFFFFF"],
  "Fresno State": ["#C41230", "#002F65", "#FFFFFF"],

  // Florida
  Florida: ["#FA4616", "#0021A5", "#FFFFFF"],
  "Florida State": ["#782F40", "#CEB888", "#FFFFFF"],
  Miami: ["#F47321", "#005030", "#FFFFFF"],
  UCF: ["#000000", "#FFCC00", "#FFFFFF"],
  "South Florida": ["#006747", "#CFC493", "#FFFFFF"],
  "Florida Atlantic": ["#003366", "#BC0007", "#FFFFFF"],

  // New York
  Syracuse: ["#F76900", "#000E54", "#FFFFFF"],
  "St. John's": ["#BA0C2F", "#FFFFFF", "#000000"],
  Buffalo: ["#005BBB", "#FFFFFF", "#000000"],
  Columbia: ["#B9D9EB", "#002060", "#FFFFFF"],
  Iona: ["#800000", "#C9B274", "#FFFFFF"],
  Army: ["#000000", "#C5B783", "#FFFFFF"],

  // Ohio
  "Ohio State": ["#BB0000", "#666666", "#FFFFFF"],
  Cincinnati: ["#E00122", "#000000", "#FFFFFF"],
  Xavier: ["#0C2340", "#898D8D", "#FFFFFF"],
  Dayton: ["#CE1126", "#002F87", "#FFFFFF"],
  Ohio: ["#00694E", "#FFFFFF", "#000000"],
  Akron: ["#002855", "#CDA962", "#FFFFFF"],

  // Pennsylvania
  "Penn State": ["#041E42", "#FFFFFF", "#5C5C5C"],
  Pitt: ["#003594", "#FFB81C", "#FFFFFF"],
  Villanova: ["#00205B", "#13B5EA", "#FFFFFF"],
  Temple: ["#9E1B32", "#FFFFFF", "#000000"],
  "Saint Joseph's": ["#A2002D", "#5D6770", "#FFFFFF"],
  Duquesne: ["#C8102E", "#003087", "#FFFFFF"],

  // Virginia
  Virginia: ["#232D4B", "#F84C1E", "#FFFFFF"],
  "Virginia Tech": ["#630031", "#CF4420", "#FFFFFF"],
  VCU: ["#000000", "#F8B800", "#FFFFFF"],
  "James Madison": ["#450084", "#CBB677", "#FFFFFF"],
  "George Mason": ["#006633", "#FFCC33", "#FFFFFF"],
  "Old Dominion": ["#00507D", "#7BAFD4", "#FFFFFF"],

  // Indiana
  Indiana: ["#990000", "#EEEDEB", "#FFFFFF"],
  Purdue: ["#000000", "#CFB991", "#FFFFFF"],
  "Notre Dame": ["#0C2340", "#C99700", "#AE9142"],
  Butler: ["#13294B", "#FFFFFF", "#000000"],
  "Indiana State": ["#0033A0", "#FFFFFF", "#000000"],

  // Massachusetts
  "Boston College": ["#8B0000", "#BC9B6A", "#FFFFFF"],
  Harvard: ["#A51C30", "#FFFFFF", "#000000"],
  UMass: ["#881C1C", "#FFFFFF", "#000000"],
  Northeastern: ["#C8102E", "#000000", "#FFFFFF"],
  "Boston University": ["#CC0000", "#FFFFFF", "#000000"],

  // Illinois
  Illinois: ["#E84A27", "#13294B", "#FFFFFF"],
  Northwestern: ["#4E2A84", "#FFFFFF", "#000000"],
  DePaul: ["#00205B", "#E31837", "#FFFFFF"],
  "Loyola Chicago": ["#8C2332", "#C8A748", "#FFFFFF"],

  // Iowa
  Iowa: ["#000000", "#FFCD00", "#FFFFFF"],
  "Iowa State": ["#C8102E", "#F1BE48", "#FFFFFF"],
  Drake: ["#004B98", "#FFFFFF", "#000000"],
  "Northern Iowa": ["#4C1A8F", "#FFCC00", "#FFFFFF"],

  // Kentucky
  Kentucky: ["#0033A0", "#FFFFFF", "#000000"],
  Louisville: ["#AD0000", "#000000", "#FFFFFF"],
  "Western Kentucky": ["#DA1F33", "#FFFFFF", "#000000"],
  "Murray State": ["#002147", "#FFC72C", "#FFFFFF"],

  // Louisiana
  LSU: ["#461D7C", "#FDD023", "#FFFFFF"],
  Tulane: ["#006747", "#418FDE", "#FFFFFF"],
  Louisiana: ["#CE181E", "#FFFFFF", "#000000"],
  "Louisiana Tech": ["#002F8B", "#CE0E2D", "#FFFFFF"],

  // Mississippi
  "Ole Miss": ["#CE1126", "#14213D", "#FFFFFF"],
  "Mississippi State": ["#5D1725", "#FFFFFF", "#898D8D"],
  "Southern Miss": ["#000000", "#FFAB00", "#FFFFFF"],
  "Jackson State": ["#002147", "#FFFFFF", "#000000"],

  // Oklahoma
  Oklahoma: ["#841617", "#FDF9D8", "#FFFFFF"],
  "Oklahoma State": ["#FF7300", "#000000", "#FFFFFF"],
  Tulsa: ["#003366", "#DAA900", "#C8102E"],
  "Oral Roberts": ["#002956", "#DAA900", "#FFFFFF"],

  // South Carolina
  "South Carolina": ["#73000A", "#000000", "#FFFFFF"],
  Clemson: ["#F66733", "#522D80", "#FFFFFF"],
  "College of Charleston": ["#6D1F2C", "#ABA677", "#FFFFFF"],
  "Coastal Carolina": ["#006F71", "#876829", "#FFFFFF"],

  // Tennessee
  Tennessee: ["#FF8200", "#FFFFFF", "#58595B"],
  Memphis: ["#003087", "#898D8D", "#FFFFFF"],
  Vanderbilt: ["#000000", "#866D4B", "#FFFFFF"],
  "Middle Tennessee": ["#0066CC", "#FFFFFF", "#000000"],

  // Utah
  Utah: ["#CC0000", "#000000", "#FFFFFF"],
  BYU: ["#002E5D", "#FFFFFF", "#A7A8AA"],
  "Utah State": ["#003E7E", "#FFFFFF", "#8A8D8F"],
  "Weber State": ["#4E2A84", "#FFFFFF", "#000000"],

  // Alabama
  Alabama: ["#9E1B32", "#FFFFFF", "#000000"],
  Auburn: ["#0C2340", "#E87722", "#FFFFFF"],
  UAB: ["#1E6B52", "#F4C300", "#FFFFFF"],

  // Arizona
  Arizona: ["#CC0033", "#003366", "#FFFFFF"],
  "Arizona State": ["#8C1D40", "#FFC627", "#FFFFFF"],
  "Grand Canyon": ["#522398", "#FFFFFF", "#000000"],

  // Colorado
  Colorado: ["#000000", "#CFB87C", "#FFFFFF"],
  "Colorado State": ["#1E4D2B", "#C8C372", "#FFFFFF"],
  "Air Force": ["#004A7B", "#8A8D8F", "#FFFFFF"],

  // Connecticut
  UConn: ["#000E2F", "#E4002B", "#FFFFFF"],
  Yale: ["#00356B", "#FFFFFF", "#000000"],
  Quinnipiac: ["#001E62", "#B58500", "#FFFFFF"],

  // Georgia
  Georgia: ["#BA0C2F", "#000000", "#FFFFFF"],
  "Georgia Tech": ["#B3A369", "#003057", "#FFFFFF"],
  "Georgia State": ["#0039A6", "#CC092F", "#FFFFFF"],

  // Kansas
  Kansas: ["#E8000D", "#0051BA", "#FFFFFF"],
  "Kansas State": ["#512888", "#A7A9AC", "#FFFFFF"],
  "Wichita State": ["#FDBB30", "#000000", "#FFFFFF"],

  // Michigan
  Michigan: ["#FFCB05", "#00274C", "#FFFFFF"],
  "Michigan State": ["#18453B", "#FFFFFF", "#000000"],
  Oakland: ["#000000", "#DAA900", "#FFFFFF"],

  // Missouri
  Missouri: ["#000000", "#F1B82D", "#FFFFFF"],
  "Saint Louis": ["#003DA5", "#CCBE8E", "#FFFFFF"],
  "Missouri State": ["#5E0009", "#FFFFFF", "#898D8D"],

  // New Jersey
  Rutgers: ["#CC0033", "#000000", "#FFFFFF"],
  "Seton Hall": ["#003ECC", "#898D8D", "#FFFFFF"],
  Princeton: ["#E77500", "#000000", "#FFFFFF"],

  // North Dakota
  "North Dakota State": ["#FFB81C", "#006646", "#FFFFFF"],
  "North Dakota": ["#009A44", "#FFFFFF", "#000000"],
  "South Dakota State": ["#003594", "#FFCC00", "#FFFFFF"],

  // Rhode Island
  Providence: ["#000000", "#FFFFFF", "#A2AAAD"],
  "Rhode Island": ["#75B2DD", "#002147", "#FFFFFF"],
  Brown: ["#4E3629", "#ED1B2F", "#FFFFFF"],

  // Washington
  Washington: ["#4B2E83", "#B7A57A", "#FFFFFF"],
  "Washington State": ["#981E32", "#5E6A71", "#FFFFFF"],
  Gonzaga: ["#041E42", "#C8102E", "#FFFFFF"],
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
  "Coastal Carolina": "Sun Belt",
  "Georgia State": "Sun Belt",
  "James Madison": "Sun Belt",
  Louisiana: "Sun Belt",
  "Old Dominion": "Sun Belt",
  "Southern Miss": "Sun Belt",

  // MAC
  Akron: "MAC",
  Buffalo: "MAC",
  Ohio: "MAC",

  // Mountain West
  "Air Force": "Mountain West",
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
  DePaul: "Big East",
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
  Princeton: "Ivy League",
  Yale: "Ivy League",

  // Patriot League
  "Boston University": "Patriot League",

  // Atlantic 10
  Davidson: "Atlantic 10",
  Dayton: "Atlantic 10",
  Duquesne: "Atlantic 10",
  "George Mason": "Atlantic 10",
  "Loyola Chicago": "Atlantic 10",
  "Rhode Island": "Atlantic 10",
  "Saint Joseph's": "Atlantic 10",
  "Saint Louis": "Atlantic 10",
  UMass: "Atlantic 10",
  VCU: "Atlantic 10",

  // Missouri Valley
  Drake: "Missouri Valley",
  "Indiana State": "Missouri Valley",
  "Missouri State": "Missouri Valley",
  "Murray State": "Missouri Valley",
  "Northern Iowa": "Missouri Valley",

  // West Coast Conference
  Gonzaga: "WCC",
  "Saint Mary's": "WCC",

  // Big Sky
  "Weber State": "Big Sky",

  // MAAC
  Iona: "MAAC",
  Quinnipiac: "MAAC",

  // Summit League
  "North Dakota": "Summit League",
  "North Dakota State": "Summit League",
  "Oral Roberts": "Summit League",
  "South Dakota State": "Summit League",

  // Horizon League
  Oakland: "Horizon League",

  // WAC
  "Grand Canyon": "WAC",

  // CAA
  "College of Charleston": "CAA",
  Northeastern: "CAA",

  // SWAC
  "Jackson State": "SWAC",

  // Pac-12 (post-2024 holdouts)
  "Washington State": "Pac-12",
}

function team(name: string): ColorsTeam {
  const colors = PALETTES[name]
  if (!colors) throw new Error(`Missing collegiate palette for ${name}`)
  const conference = CONFERENCES[name]
  if (!conference) throw new Error(`Missing conference for ${name}`)
  return { name, league: conference, colors }
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
    teams: [
      team("Oklahoma"),
      team("Oklahoma State"),
      team("Tulsa"),
      team("Oral Roberts"),
    ],
  },
  {
    id: "SC",
    name: "South Carolina",
    teams: [
      team("South Carolina"),
      team("Clemson"),
      team("College of Charleston"),
      team("Coastal Carolina"),
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
    ],
  },
  {
    id: "UT",
    name: "Utah",
    teams: [team("Utah"), team("BYU"), team("Utah State"), team("Weber State")],
  },
  {
    id: "AL",
    name: "Alabama",
    teams: [team("Alabama"), team("Auburn"), team("UAB")],
  },
  {
    id: "AZ",
    name: "Arizona",
    teams: [team("Arizona"), team("Arizona State"), team("Grand Canyon")],
  },
  {
    id: "CO",
    name: "Colorado",
    teams: [team("Colorado"), team("Colorado State"), team("Air Force")],
  },
  {
    id: "CT",
    name: "Connecticut",
    teams: [team("UConn"), team("Yale"), team("Quinnipiac")],
  },
  {
    id: "GA",
    name: "Georgia",
    teams: [team("Georgia"), team("Georgia Tech"), team("Georgia State")],
  },
  {
    id: "KS",
    name: "Kansas",
    teams: [team("Kansas"), team("Kansas State"), team("Wichita State")],
  },
  {
    id: "MI",
    name: "Michigan",
    teams: [team("Michigan"), team("Michigan State"), team("Oakland")],
  },
  {
    id: "MO",
    name: "Missouri",
    teams: [team("Missouri"), team("Saint Louis"), team("Missouri State")],
  },
  {
    id: "NJ",
    name: "New Jersey",
    teams: [team("Rutgers"), team("Seton Hall"), team("Princeton")],
  },
  {
    id: "ND",
    name: "North Dakota",
    teams: [team("North Dakota State"), team("North Dakota"), team("South Dakota State")],
  },
  {
    id: "RI",
    name: "Rhode Island",
    teams: [team("Providence"), team("Rhode Island"), team("Brown")],
  },
  {
    id: "WA",
    name: "Washington",
    teams: [team("Washington"), team("Washington State"), team("Gonzaga")],
  },
]
