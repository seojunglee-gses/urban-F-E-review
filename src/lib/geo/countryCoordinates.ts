export interface CountryCoordinate {
  country: string;
  x: number;
  y: number;
}

export const COUNTRY_COORDINATES: CountryCoordinate[] = [
  { country: "US", x: 23, y: 42 },
  { country: "United States", x: 23, y: 42 },
  { country: "CA", x: 21, y: 32 },
  { country: "Canada", x: 21, y: 32 },
  { country: "GB", x: 47, y: 35 },
  { country: "United Kingdom", x: 47, y: 35 },
  { country: "DE", x: 51, y: 36 },
  { country: "Germany", x: 51, y: 36 },
  { country: "FR", x: 49, y: 39 },
  { country: "France", x: 49, y: 39 },
  { country: "IT", x: 52, y: 45 },
  { country: "Italy", x: 52, y: 45 },
  { country: "ES", x: 46, y: 45 },
  { country: "Spain", x: 46, y: 45 },
  { country: "NL", x: 50, y: 35 },
  { country: "Netherlands", x: 50, y: 35 },
  { country: "CN", x: 74, y: 43 },
  { country: "China", x: 74, y: 43 },
  { country: "JP", x: 83, y: 45 },
  { country: "Japan", x: 83, y: 45 },
  { country: "KR", x: 80, y: 43 },
  { country: "South Korea", x: 80, y: 43 },
  { country: "SG", x: 72, y: 63 },
  { country: "Singapore", x: 72, y: 63 },
  { country: "AU", x: 81, y: 78 },
  { country: "Australia", x: 81, y: 78 },
  { country: "BR", x: 34, y: 68 },
  { country: "Brazil", x: 34, y: 68 },
  { country: "IN", x: 66, y: 53 },
  { country: "India", x: 66, y: 53 },
];

export const getCountryCoordinate = (country: string): CountryCoordinate | undefined =>
  COUNTRY_COORDINATES.find((coordinate) => coordinate.country.toLowerCase() === country.toLowerCase());
