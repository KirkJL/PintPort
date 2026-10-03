export type Venue = {
  id: string;
  name: string;
  city: string;
  country: string;
  countryCode: string;
  lat: number;
  lng: number;
  status?: string;
};
export type Experience = {
  id: string;
  beer: string;
  brewery: string;
  style: string;
  abv: number | null;
  venueId: string;
  rating: number | null;
  date: string;
  price: number | null;
  currency: string;
  notes: string;
  venueNotes: string;
  photo: string | null;
  drinkAgain: boolean;
  wouldReturn: boolean;
  venueRating: number | null;
  pourRating: number | null;
  priceRating: number | null;
  contribute: boolean;
};
export const venues: Venue[] = [
  {
    id: "demo-sundia",
    name: "Sundia by Liberty",
    city: "Ölüdeniz",
    country: "Türkiye",
    countryCode: "TR",
    lat: 36.5485,
    lng: 29.1217,
  },
  {
    id: "demo-pegasus",
    name: "Beach bar",
    city: "Ölüdeniz",
    country: "Türkiye",
    countryCode: "TR",
    lat: 36.5462,
    lng: 29.1178,
  },
  {
    id: "demo-monkeys",
    name: "Three Wise Monkeys",
    city: "Colchester",
    country: "United Kingdom",
    countryCode: "GB",
    lat: 51.8906,
    lng: 0.901,
  },
  {
    id: "demo-lisbon",
    name: "Riverside terrace",
    city: "Lisbon",
    country: "Portugal",
    countryCode: "PT",
    lat: 38.706,
    lng: -9.144,
  },
  {
    id: "demo-paderne",
    name: "Village café",
    city: "Paderne",
    country: "Portugal",
    countryCode: "PT",
    lat: 37.178,
    lng: -8.201,
  },
];
const base = {
  abv: 5,
  price: 3.5,
  currency: "EUR",
  notes: "",
  venueNotes: "",
  photo: null,
  drinkAgain: true,
  wouldReturn: true,
  venueRating: null,
  pourRating: null,
  priceRating: null,
  contribute: false,
};
export const examples: Experience[] = [
  {
    ...base,
    id: "demo-1",
    beer: "Efes Pilsen",
    brewery: "Anadolu Efes",
    style: "Pilsner",
    venueId: "demo-sundia",
    rating: 9.5,
    date: "2026-09-29T17:30:00",
    notes:
      "First beer of the holiday. Sea air, a golden sunset, and absolutely nowhere to be.",
    photo: "/photos/sea.jpg",
  },
  {
    ...base,
    id: "demo-2",
    beer: "Tuborg Gold",
    brewery: "Türk Tuborg",
    style: "Lager",
    venueId: "demo-pegasus",
    rating: 8,
    date: "2026-09-28T16:00:00",
    notes: "Cold beer, warm evening. One for the memory bank.",
    photo: "/photos/beach.jpg",
  },
  {
    ...base,
    id: "demo-3",
    beer: "Efes Pilsen",
    brewery: "Anadolu Efes",
    style: "Pilsner",
    venueId: "demo-sundia",
    rating: 8.5,
    date: "2026-09-27T19:00:00",
    notes: "Back for another. Same beer, a different evening.",
  },
  {
    ...base,
    id: "demo-4",
    beer: "The Journey Begins",
    brewery: "Other Monkey Brewing",
    style: "IPA",
    venueId: "demo-monkeys",
    rating: 8,
    date: "2026-08-29T15:15:00",
    currency: "GBP",
    price: 5.8,
    notes:
      "Crisp, citrusy and dangerously easy to drink. The sort of pint that accidentally becomes three.",
  },
  {
    ...base,
    id: "demo-5",
    beer: "Super Bock",
    brewery: "Super Bock Group",
    style: "Lager",
    venueId: "demo-lisbon",
    rating: 8.5,
    date: "2026-07-14T18:00:00",
    price: 3,
    notes: "Watching the ferries on the Tagus.",
  },
  {
    ...base,
    id: "demo-6",
    beer: "Sagres",
    brewery: "Sociedade Central de Cervejas",
    style: "Lager",
    venueId: "demo-paderne",
    rating: 7.5,
    date: "2026-07-12T13:30:00",
    price: 2.5,
    notes: "A quiet afternoon in the village.",
  },
];
export const flag = (code: string) =>
  code
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
export function stats(entries: Experience[], places: Venue[]) {
  const used = places.filter((v) => entries.some((e) => e.venueId === v.id));
  const ratings = entries
    .map((e) => e.rating)
    .filter((x): x is number => x !== null);
  return {
    experiences: entries.length,
    beers: new Set(
      entries.map((e) => `${e.brewery.toLowerCase()}|${e.beer.toLowerCase()}`),
    ).size,
    venues: used.length,
    countries: new Set(used.map((v) => v.countryCode)).size,
    cities: new Set(used.map((v) => `${v.countryCode}|${v.city}`)).size,
    average: ratings.length
      ? ratings.reduce((a, b) => a + b, 0) / ratings.length
      : null,
  };
}
