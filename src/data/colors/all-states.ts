export interface USState {
  id: string
  name: string
  lat: number
  lng: number
}

export const ALL_STATES: USState[] = [
  { id: "AL", name: "Alabama", lat: 32.81, lng: -86.79 },
  { id: "AK", name: "Alaska", lat: 64.07, lng: -152.28 },
  { id: "AZ", name: "Arizona", lat: 34.05, lng: -111.09 },
  { id: "AR", name: "Arkansas", lat: 34.97, lng: -92.37 },
  { id: "CA", name: "California", lat: 36.78, lng: -119.42 },
  { id: "CO", name: "Colorado", lat: 39.55, lng: -105.78 },
  { id: "CT", name: "Connecticut", lat: 41.62, lng: -72.73 },
  { id: "DE", name: "Delaware", lat: 38.99, lng: -75.51 },
  { id: "FL", name: "Florida", lat: 27.99, lng: -81.76 },
  { id: "GA", name: "Georgia", lat: 33.04, lng: -83.64 },
  { id: "HI", name: "Hawaii", lat: 20.79, lng: -156.5 },
  { id: "ID", name: "Idaho", lat: 44.07, lng: -114.74 },
  { id: "IL", name: "Illinois", lat: 40.35, lng: -89.2 },
  { id: "IN", name: "Indiana", lat: 39.85, lng: -86.27 },
  { id: "IA", name: "Iowa", lat: 42.01, lng: -93.21 },
  { id: "KS", name: "Kansas", lat: 38.5, lng: -98.38 },
  { id: "KY", name: "Kentucky", lat: 37.67, lng: -84.67 },
  { id: "LA", name: "Louisiana", lat: 31.17, lng: -91.87 },
  { id: "ME", name: "Maine", lat: 44.69, lng: -69.38 },
  { id: "MD", name: "Maryland", lat: 39.06, lng: -76.8 },
  { id: "MA", name: "Massachusetts", lat: 42.23, lng: -71.53 },
  { id: "MI", name: "Michigan", lat: 44.31, lng: -85.6 },
  { id: "MN", name: "Minnesota", lat: 46.73, lng: -94.69 },
  { id: "MS", name: "Mississippi", lat: 32.74, lng: -89.68 },
  { id: "MO", name: "Missouri", lat: 38.46, lng: -92.29 },
  { id: "MT", name: "Montana", lat: 46.92, lng: -110.45 },
  { id: "NE", name: "Nebraska", lat: 41.13, lng: -98.27 },
  { id: "NV", name: "Nevada", lat: 38.31, lng: -117.05 },
  { id: "NH", name: "New Hampshire", lat: 43.45, lng: -71.56 },
  { id: "NJ", name: "New Jersey", lat: 40.3, lng: -74.52 },
  { id: "NM", name: "New Mexico", lat: 34.84, lng: -106.25 },
  { id: "NY", name: "New York", lat: 42.99, lng: -75.62 },
  { id: "NC", name: "North Carolina", lat: 35.63, lng: -79.81 },
  { id: "ND", name: "North Dakota", lat: 47.53, lng: -99.78 },
  { id: "OH", name: "Ohio", lat: 40.42, lng: -82.91 },
  { id: "OK", name: "Oklahoma", lat: 35.57, lng: -96.93 },
  { id: "OR", name: "Oregon", lat: 44.57, lng: -122.07 },
  { id: "PA", name: "Pennsylvania", lat: 40.59, lng: -77.21 },
  { id: "RI", name: "Rhode Island", lat: 41.68, lng: -71.51 },
  { id: "SC", name: "South Carolina", lat: 33.86, lng: -80.95 },
  { id: "SD", name: "South Dakota", lat: 44.3, lng: -99.44 },
  { id: "TN", name: "Tennessee", lat: 35.75, lng: -86.69 },
  { id: "TX", name: "Texas", lat: 31.05, lng: -97.56 },
  { id: "UT", name: "Utah", lat: 40.15, lng: -111.86 },
  { id: "VT", name: "Vermont", lat: 44.05, lng: -72.71 },
  { id: "VA", name: "Virginia", lat: 37.77, lng: -78.17 },
  { id: "WA", name: "Washington", lat: 47.4, lng: -121.49 },
  { id: "WV", name: "West Virginia", lat: 38.49, lng: -80.95 },
  { id: "WI", name: "Wisconsin", lat: 44.27, lng: -89.62 },
  { id: "WY", name: "Wyoming", lat: 42.76, lng: -107.3 },
]

export function getStateByName(name: string): USState | undefined {
  const lower = name.toLowerCase()
  return ALL_STATES.find(s => s.name.toLowerCase() === lower)
}

export function getStateById(id: string): USState | undefined {
  return ALL_STATES.find(s => s.id === id)
}
