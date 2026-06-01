const ESPN = "https://a.espncdn.com/i/teamlogos/ncaa/500"
const FLAG = "https://flagcdn.com/w80"

// ESPN NCAA team IDs → logo URL
const COLLEGE_LOGOS: Record<string, string> = {
  ALA: `${ESPN}/333.png`, // Alabama
  ARIZ: `${ESPN}/12.png`, // Arizona
  ASU: `${ESPN}/9.png`, // Arizona State
  ARK: `${ESPN}/8.png`, // Arkansas
  AUB: `${ESPN}/2.png`, // Auburn
  BAY: `${ESPN}/239.png`, // Baylor
  BC: `${ESPN}/103.png`, // Boston College
  BSU: `${ESPN}/68.png`, // Boise State
  BYU: `${ESPN}/252.png`, // BYU
  CAL: `${ESPN}/25.png`, // California
  CINC: `${ESPN}/2132.png`, // Cincinnati
  CLEM: `${ESPN}/228.png`, // Clemson
  CMU: `${ESPN}/2117.png`, // Central Michigan
  COL: `${ESPN}/38.png`, // Colorado
  CSU: `${ESPN}/36.png`, // Colorado State
  DAV: `${ESPN}/2429.png`, // Davidson
  DUKE: `${ESPN}/150.png`, // Duke
  FLA: `${ESPN}/57.png`, // Florida
  FSU: `${ESPN}/52.png`, // Florida State
  FRES: `${ESPN}/278.png`, // Fresno State
  GBAY: `${ESPN}/2750.png`, // Green Bay (UWGB)
  UGA: `${ESPN}/61.png`, // Georgia
  GONZ: `${ESPN}/2250.png`, // Gonzaga
  HOU: `${ESPN}/248.png`, // Houston
  ILL: `${ESPN}/356.png`, // Illinois
  IU: `${ESPN}/84.png`, // Indiana
  UI: `${ESPN}/2294.png`, // Iowa
  ISU: `${ESPN}/66.png`, // Iowa State
  KU: `${ESPN}/2305.png`, // Kansas
  KSU: `${ESPN}/2306.png`, // Kansas State
  UK: `${ESPN}/96.png`, // Kentucky
  LEH: `${ESPN}/2352.png`, // Lehigh
  LSU: `${ESPN}/99.png`, // LSU
  UofL: `${ESPN}/97.png`, // Louisville
  MKE: `${ESPN}/269.png`, // Marquette
  MEM: `${ESPN}/235.png`, // Memphis
  MICH: `${ESPN}/130.png`, // Michigan
  MSU: `${ESPN}/127.png`, // Michigan State
  MIZZ: `${ESPN}/142.png`, // Missouri
  MRST: `${ESPN}/93.png`, // Murray State
  NEV: `${ESPN}/2440.png`, // Nevada
  NMS: `${ESPN}/166.png`, // New Mexico State
  EWU: `${ESPN}/331.png`, // Eastern Washington
  FAU: `${ESPN}/2226.png`, // Florida Atlantic
  FIU: `${ESPN}/2229.png`, // Florida International
  GT: `${ESPN}/59.png`, // Georgia Tech
  LIB: `${ESPN}/2335.png`, // Liberty
  MD: `${ESPN}/120.png`, // Maryland
  MIAMI: `${ESPN}/2390.png`, // Miami (FL)
  MINN: `${ESPN}/135.png`, // Minnesota
  MISS: `${ESPN}/145.png`, // Ole Miss
  MST: `${ESPN}/344.png`, // Mississippi State
  NEB: `${ESPN}/158.png`, // Nebraska
  NCST: `${ESPN}/152.png`, // NC State
  ND: `${ESPN}/87.png`, // Notre Dame
  NDST: `${ESPN}/2449.png`, // North Dakota State
  UNC: `${ESPN}/153.png`, // North Carolina
  ORST: `${ESPN}/204.png`, // Oregon State
  OSU: `${ESPN}/194.png`, // Ohio State
  OU: `${ESPN}/201.png`, // Oklahoma
  OkSt: `${ESPN}/197.png`, // Oklahoma State
  ORE: `${ESPN}/2483.png`, // Oregon
  PITT: `${ESPN}/221.png`, // Pittsburgh
  PSU: `${ESPN}/213.png`, // Penn State
  PUR: `${ESPN}/2509.png`, // Purdue
  RUT: `${ESPN}/164.png`, // Rutgers
  SC: `${ESPN}/2579.png`, // South Carolina
  SDST: `${ESPN}/2571.png`, // South Dakota State
  SDSU: `${ESPN}/21.png`, // San Diego State
  SCU: `${ESPN}/2608.png`, // Santa Clara
  SMU: `${ESPN}/2567.png`, // SMU
  STAN: `${ESPN}/24.png`, // Stanford
  SYR: `${ESPN}/183.png`, // Syracuse
  TCU: `${ESPN}/2628.png`, // TCU
  TENN: `${ESPN}/2633.png`, // Tennessee
  TEX: `${ESPN}/251.png`, // Texas
  TAM: `${ESPN}/245.png`, // Texas A&M
  TTU: `${ESPN}/2641.png`, // Texas Tech
  TOL: `${ESPN}/325.png`, // Toledo
  TUL: `${ESPN}/2655.png`, // Tulane
  UCF: `${ESPN}/2116.png`, // UCF
  UCLA: `${ESPN}/26.png`, // UCLA
  UNLV: `${ESPN}/2439.png`, // UNLV
  USC: `${ESPN}/30.png`, // USC
  UTEP: `${ESPN}/2638.png`, // UTEP
  UTA: `${ESPN}/254.png`, // Utah
  USU: `${ESPN}/328.png`, // Utah State
  VAN: `${ESPN}/238.png`, // Vanderbilt
  NOVA: `${ESPN}/222.png`, // Villanova
  UVA: `${ESPN}/258.png`, // Virginia
  VT: `${ESPN}/259.png`, // Virginia Tech
  WFU: `${ESPN}/154.png`, // Wake Forest
  UW: `${ESPN}/264.png`, // Washington
  WSU: `${ESPN}/265.png`, // Washington State
  WEB: `${ESPN}/2692.png`, // Weber State
  WIS: `${ESPN}/275.png`, // Wisconsin
  WKU: `${ESPN}/98.png`, // Western Kentucky
  WST: `${ESPN}/2691.png`, // Wichita State
  WVU: `${ESPN}/276.png`, // West Virginia
  WYO: `${ESPN}/277.png`, // Wyoming
  YALE: `${ESPN}/43.png`, // Yale
  HCROSS: `${ESPN}/107.png`, // Holy Cross
}

// Country flags (ISO 3166-1 alpha-2 codes via flagcdn.com)
const COUNTRY_FLAGS: Record<string, string> = {
  AUS: `${FLAG}/au.png`, // Australia
  AUT: `${FLAG}/at.png`, // Austria
  BIH: `${FLAG}/ba.png`, // Bosnia & Herzegovina
  FRA: `${FLAG}/fr.png`, // France
  GER: `${FLAG}/de.png`, // Germany
  GRE: `${FLAG}/gr.png`, // Greece
  ISR: `${FLAG}/il.png`, // Israel
  LAT: `${FLAG}/lv.png`, // Latvia
  LTU: `${FLAG}/lt.png`, // Lithuania
  MNE: `${FLAG}/me.png`, // Montenegro
  SLO: `${FLAG}/si.png`, // Slovenia
  SRB: `${FLAG}/rs.png`, // Serbia
  SUI: `${FLAG}/ch.png`, // Switzerland
  SWE: `${FLAG}/se.png`, // Sweden
  TUR: `${FLAG}/tr.png`, // Turkey
}

export function getSchoolLogoUrl(schoolAbbr: string): string | null {
  return COLLEGE_LOGOS[schoolAbbr] ?? COUNTRY_FLAGS[schoolAbbr] ?? null
}

export function isFlag(schoolAbbr: string): boolean {
  return schoolAbbr in COUNTRY_FLAGS
}
