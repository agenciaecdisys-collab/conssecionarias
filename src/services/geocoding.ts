export interface GeocodingResult {
  latitude: number;
  longitude: number;
  displayName: string;
}

export async function searchAddresses(query: string): Promise<GeocodingResult[]> {
  if (query.trim().length < 3) return [];

  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '5');
  url.searchParams.set('countrycodes', 'br');
  url.searchParams.set('addressdetails', '1');

  const response = await fetch(url.toString(), {
    headers: { 'Accept-Language': 'pt-BR' },
  });

  if (!response.ok) return [];

  const data = await response.json();

  return data.map((item: any) => ({
    latitude: parseFloat(item.lat),
    longitude: parseFloat(item.lon),
    displayName: item.display_name,
  }));
}
