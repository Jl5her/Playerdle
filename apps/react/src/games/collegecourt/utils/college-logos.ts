const ESPN = "https://a.espncdn.com/i/teamlogos/ncaa/500"
const FLAG = "https://flagcdn.com/w80"

// ESPN NCAA team IDs → logo URL
const COLLEGE_LOGOS: Record<string, string> = {
  ALA:  `${ESPN}/333.png`,   // Alabama
  ARIZ: `${ESPN}/12.png`,    // Arizona
  ASU:  `${ESPN}/9.png`,     // Arizona State
  ARK:  `${ESPN}/8.png`,     // Arkansas
  AUB:  `${ESPN}/2.png`,     // Auburn
  BSU:  `${ESPN}/68.png`,    // Boise State
  CAL:  `${ESPN}/25.png`,    // California
  DAV:  `${ESPN}/2429.png`,  // Davidson
  DUKE: `${ESPN}/150.png`,   // Duke
  FLA:  `${ESPN}/57.png`,    // Florida
  FSU:  `${ESPN}/52.png`,    // Florida State
  FRES: `${ESPN}/278.png`,   // Fresno State
  UGA:  `${ESPN}/61.png`,    // Georgia
  GONZ: `${ESPN}/2250.png`,  // Gonzaga
  UI:   `${ESPN}/2294.png`,  // Iowa
  ISU:  `${ESPN}/66.png`,    // Iowa State
  KU:   `${ESPN}/2305.png`,  // Kansas
  UK:   `${ESPN}/96.png`,    // Kentucky
  LEH:  `${ESPN}/2352.png`,  // Lehigh
  LSU:  `${ESPN}/99.png`,    // LSU
  UofL: `${ESPN}/97.png`,    // Louisville
  MKE:  `${ESPN}/269.png`,   // Marquette
  MEM:  `${ESPN}/235.png`,   // Memphis
  MICH: `${ESPN}/130.png`,   // Michigan
  MSU:  `${ESPN}/127.png`,   // Michigan State
  MIZZ: `${ESPN}/142.png`,   // Missouri
  MRST: `${ESPN}/93.png`,    // Murray State
  NEV:  `${ESPN}/2440.png`,  // Nevada
  NMS:  `${ESPN}/166.png`,   // New Mexico State
  UNC:  `${ESPN}/153.png`,   // North Carolina
  OSU:  `${ESPN}/194.png`,   // Ohio State
  OU:   `${ESPN}/201.png`,   // Oklahoma
  OkSt: `${ESPN}/197.png`,   // Oklahoma State
  ORE:  `${ESPN}/2483.png`,  // Oregon
  PUR:  `${ESPN}/2509.png`,  // Purdue
  SDSU: `${ESPN}/21.png`,    // San Diego State
  SCU:  `${ESPN}/2608.png`,  // Santa Clara
  STAN: `${ESPN}/24.png`,    // Stanford
  SYR:  `${ESPN}/183.png`,   // Syracuse
  TCU:  `${ESPN}/2628.png`,  // TCU
  TENN: `${ESPN}/2633.png`,  // Tennessee
  TEX:  `${ESPN}/251.png`,   // Texas
  TAM:  `${ESPN}/245.png`,   // Texas A&M
  UCLA: `${ESPN}/26.png`,    // UCLA
  UNLV: `${ESPN}/2439.png`,  // UNLV
  USC:  `${ESPN}/30.png`,    // USC
  UTA:  `${ESPN}/254.png`,   // Utah
  VAN:  `${ESPN}/238.png`,   // Vanderbilt
  NOVA: `${ESPN}/222.png`,   // Villanova
  UVA:  `${ESPN}/258.png`,   // Virginia
  WFU:  `${ESPN}/154.png`,   // Wake Forest
  UW:   `${ESPN}/264.png`,   // Washington
  WSU:  `${ESPN}/265.png`,   // Washington State
  WEB:  `${ESPN}/2692.png`,  // Weber State
  WST:  `${ESPN}/2691.png`,  // Wichita State
}

// Country flags (ISO 3166-1 alpha-2 codes via flagcdn.com)
const COUNTRY_FLAGS: Record<string, string> = {
  AUS: `${FLAG}/au.png`,   // Australia
  AUT: `${FLAG}/at.png`,   // Austria
  BIH: `${FLAG}/ba.png`,   // Bosnia & Herzegovina
  FRA: `${FLAG}/fr.png`,   // France
  GER: `${FLAG}/de.png`,   // Germany
  GRE: `${FLAG}/gr.png`,   // Greece
  ISR: `${FLAG}/il.png`,   // Israel
  LAT: `${FLAG}/lv.png`,   // Latvia
  LTU: `${FLAG}/lt.png`,   // Lithuania
  MNE: `${FLAG}/me.png`,   // Montenegro
  SLO: `${FLAG}/si.png`,   // Slovenia
  SRB: `${FLAG}/rs.png`,   // Serbia
  SUI: `${FLAG}/ch.png`,   // Switzerland
  TUR: `${FLAG}/tr.png`,   // Turkey
}

export function getSchoolLogoUrl(schoolAbbr: string): string | null {
  return COLLEGE_LOGOS[schoolAbbr] ?? COUNTRY_FLAGS[schoolAbbr] ?? null
}

export function isFlag(schoolAbbr: string): boolean {
  return schoolAbbr in COUNTRY_FLAGS
}
