export interface CityCoordinate {
  city: string;
  country: string;
  x: number;
  y: number;
}

export const cityCoordinates: Record<string, CityCoordinate> = {
  London: { city: "London", country: "United Kingdom", x: 47, y: 34 },
  "New York": { city: "New York", country: "United States", x: 25, y: 41 },
  Seoul: { city: "Seoul", country: "South Korea", x: 78, y: 45 },
  Tokyo: { city: "Tokyo", country: "Japan", x: 83, y: 47 },
  Beijing: { city: "Beijing", country: "China", x: 73, y: 42 },
  Shanghai: { city: "Shanghai", country: "China", x: 75, y: 49 },
  Singapore: { city: "Singapore", country: "Singapore", x: 70, y: 66 },
  Paris: { city: "Paris", country: "France", x: 48, y: 39 },
  Berlin: { city: "Berlin", country: "Germany", x: 51, y: 36 },
  Toronto: { city: "Toronto", country: "Canada", x: 23, y: 39 },
  "Los Angeles": {
    city: "Los Angeles",
    country: "United States",
    x: 16,
    y: 47,
  },
  Sydney: { city: "Sydney", country: "Australia", x: 82, y: 80 },
  Melbourne: { city: "Melbourne", country: "Australia", x: 80, y: 84 },
  "Hong Kong": { city: "Hong Kong", country: "China", x: 73, y: 55 },
  Barcelona: { city: "Barcelona", country: "Spain", x: 48, y: 45 },
  Milan: { city: "Milan", country: "Italy", x: 50, y: 42 },
  Amsterdam: { city: "Amsterdam", country: "Netherlands", x: 49, y: 35 },
  Chicago: { city: "Chicago", country: "United States", x: 21, y: 41 },
  Boston: { city: "Boston", country: "United States", x: 26, y: 40 },
  "San Francisco": {
    city: "San Francisco",
    country: "United States",
    x: 15,
    y: 44,
  },
  Vancouver: { city: "Vancouver", country: "Canada", x: 15, y: 35 },
  Stockholm: { city: "Stockholm", country: "Sweden", x: 53, y: 27 },
  Helsinki: { city: "Helsinki", country: "Finland", x: 55, y: 27 },
  Mumbai: { city: "Mumbai", country: "India", x: 64, y: 60 },
  "São Paulo": { city: "São Paulo", country: "Brazil", x: 34, y: 72 },
  Phoenix: { city: "Phoenix", country: "United States", x: 17, y: 48 },
  "Cape Town": { city: "Cape Town", country: "South Africa", x: 52, y: 82 },
};

export const findCityCoordinate = (location: string): CityCoordinate | null => {
  const normalized = location.toLowerCase();
  const direct = Object.values(cityCoordinates).find(
    (coordinate) => coordinate.city.toLowerCase() === normalized,
  );
  if (direct) return direct;
  return (
    Object.values(cityCoordinates).find(
      (coordinate) =>
        normalized.includes(coordinate.city.toLowerCase()) ||
        coordinate.city.toLowerCase().includes(normalized),
    ) ?? null
  );
};
