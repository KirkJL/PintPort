import {
  sqliteTable,
  text,
  integer,
  real,
  uniqueIndex,
  index,
} from "drizzle-orm/sqlite-core";
export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    subject: text("subject").notNull(),
    issuer: text("issuer").notNull(),
    name: text("name").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [uniqueIndex("users_identity").on(t.issuer, t.subject)],
);
export const sessions = sqliteTable(
  "sessions",
  {
    hash: text("hash").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: integer("expires_at").notNull(),
  },
  (t) => [index("sessions_user").on(t.userId)],
);
export const authTransactions = sqliteTable("auth_transactions", {
  hash: text("hash").primaryKey(),
  state: text("state").notNull(),
  nonce: text("nonce").notNull(),
  verifier: text("verifier").notNull(),
  expiresAt: integer("expires_at").notNull(),
});
export const breweries = sqliteTable("breweries", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  normalized: text("normalized").notNull().unique(),
});
export const beers = sqliteTable(
  "beers",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    normalized: text("normalized").notNull(),
    breweryId: text("brewery_id")
      .notNull()
      .references(() => breweries.id),
    style: text("style").notNull(),
    abv: real("abv"),
  },
  (t) => [uniqueIndex("beer_identity").on(t.normalized, t.breweryId)],
);
export const venues = sqliteTable(
  "venues",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    normalized: text("normalized").notNull(),
    city: text("city").notNull(),
    country: text("country").notNull(),
    countryCode: text("country_code").notNull(),
    lat: real("lat").notNull(),
    lng: real("lng").notNull(),
    status: text("status").notNull().default("pending"),
    createdBy: text("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    mergedInto: text("merged_into"),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [
    index("venue_geo").on(t.lat, t.lng),
    index("venue_normalized").on(t.normalized),
    uniqueIndex("venue_exact_identity").on(t.normalized, t.lat, t.lng),
  ],
);
export const venueSources = sqliteTable(
  "venue_sources",
  {
    venueId: text("venue_id")
      .notNull()
      .references(() => venues.id),
    provider: text("provider").notNull(),
    externalId: text("external_id").notNull(),
  },
  (t) => [uniqueIndex("venue_external").on(t.provider, t.externalId)],
);
export const venueAliases = sqliteTable("venue_aliases", {
  id: text("id").primaryKey(),
  venueId: text("venue_id")
    .notNull()
    .references(() => venues.id),
  name: text("name").notNull(),
});
export const experiences = sqliteTable(
  "experiences",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    beerId: text("beer_id")
      .notNull()
      .references(() => beers.id),
    venueId: text("venue_id")
      .notNull()
      .references(() => venues.id),
    rating: real("rating"),
    occurredAt: text("occurred_at").notNull(),
    price: real("price"),
    currency: text("currency").notNull(),
    notes: text("notes").notNull(),
    venueNotes: text("venue_notes").notNull(),
    drinkAgain: integer("drink_again").notNull(),
    wouldReturn: integer("would_return").notNull(),
    venueRating: real("venue_rating"),
    pourRating: real("pour_rating"),
    priceRating: real("price_rating"),
    contribute: integer("contribute").notNull().default(0),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [
    index("experience_owner_date").on(t.userId, t.occurredAt),
    index("experience_venue_contribute").on(t.venueId, t.contribute),
  ],
);
export const photos = sqliteTable("photos", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  experienceId: text("experience_id").references(() => experiences.id, {
    onDelete: "set null",
  }),
  objectKey: text("object_key").notNull(),
  createdAt: integer("created_at").notNull(),
});
export const rateLimits = sqliteTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  expiresAt: integer("expires_at").notNull(),
});
