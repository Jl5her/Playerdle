// 3-color brand palettes for every NFL team. Keyed by current franchise
// display name (matches src/data/nfl/teams.json). Used by the Journey
// ladder to render 3-diamond rows mirroring Statehue.

export const NFL_TEAM_PALETTES: Record<string, [string, string, string]> = {
  "Arizona Cardinals": ["#97233F", "#000000", "#FFB612"],
  "Atlanta Falcons": ["#A71930", "#000000", "#A5ACAF"],
  "Baltimore Ravens": ["#241773", "#000000", "#9E7C0C"],
  "Buffalo Bills": ["#00338D", "#C60C30", "#FFFFFF"],
  "Carolina Panthers": ["#0085CA", "#101820", "#BFC0BF"],
  "Chicago Bears": ["#0B162A", "#C83803", "#FFFFFF"],
  "Cincinnati Bengals": ["#FB4F14", "#000000", "#FFFFFF"],
  "Cleveland Browns": ["#311D00", "#FF3C00", "#FFFFFF"],
  "Dallas Cowboys": ["#003594", "#869397", "#FFFFFF"],
  "Denver Broncos": ["#FB4F14", "#002244", "#FFFFFF"],
  "Detroit Lions": ["#0076B6", "#B0B7BC", "#000000"],
  "Green Bay Packers": ["#203731", "#FFB612", "#FFFFFF"],
  "Houston Texans": ["#03202F", "#A71930", "#FFFFFF"],
  "Indianapolis Colts": ["#002C5F", "#A2AAAD", "#FFFFFF"],
  "Jacksonville Jaguars": ["#006778", "#D7A22A", "#101820"],
  "Kansas City Chiefs": ["#E31837", "#FFB81C", "#FFFFFF"],
  "Las Vegas Raiders": ["#000000", "#A5ACAF", "#FFFFFF"],
  "Los Angeles Chargers": ["#0080C6", "#FFC20E", "#002A5E"],
  "Los Angeles Rams": ["#003594", "#FFA300", "#FFFFFF"],
  "Miami Dolphins": ["#008E97", "#FC4C02", "#005778"],
  "Minnesota Vikings": ["#4F2683", "#FFC62F", "#FFFFFF"],
  "New England Patriots": ["#002244", "#C60C30", "#B0B7BC"],
  "New Orleans Saints": ["#D3BC8D", "#101820", "#FFFFFF"],
  "New York Giants": ["#0B2265", "#A71930", "#A5ACAF"],
  "New York Jets": ["#115740", "#FFFFFF", "#000000"],
  "Philadelphia Eagles": ["#004C54", "#A5ACAF", "#000000"],
  "Pittsburgh Steelers": ["#FFB612", "#000000", "#C60C30"],
  "San Francisco 49ers": ["#AA0000", "#B3995D", "#FFFFFF"],
  "Seattle Seahawks": ["#002244", "#69BE28", "#A5ACAF"],
  "Tampa Bay Buccaneers": ["#D50A0A", "#34302B", "#FF7900"],
  "Tennessee Titans": ["#4B92DB", "#0C2340", "#C8102E"],
  "Washington Commanders": ["#5A1414", "#FFB612", "#FFFFFF"],
}

export function getNflTeamPalette(teamName: string): [string, string, string] | undefined {
  return NFL_TEAM_PALETTES[teamName]
}
