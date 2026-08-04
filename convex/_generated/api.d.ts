/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as adminAuth from "../adminAuth.js";
import type * as appSettings from "../appSettings.js";
import type * as articles from "../articles.js";
import type * as crons from "../crons.js";
import type * as documents from "../documents.js";
import type * as facebook_mutations from "../facebook/mutations.js";
import type * as facebook_queries from "../facebook/queries.js";
import type * as facebook_sync from "../facebook/sync.js";
import type * as feed from "../feed.js";
import type * as files from "../files.js";
import type * as galleries from "../galleries.js";
import type * as liveStreams from "../liveStreams.js";
import type * as matches from "../matches.js";
import type * as matchesSync from "../matchesSync.js";
import type * as pages from "../pages.js";
import type * as people from "../people.js";
import type * as seed from "../seed.js";
import type * as settings from "../settings.js";
import type * as slugify from "../slugify.js";
import type * as sources_encoding from "../sources/encoding.js";
import type * as sources_ninetyMinut from "../sources/ninetyMinut.js";
import type * as sources_polishTime from "../sources/polishTime.js";
import type * as sources_virium from "../sources/virium.js";
import type * as sponsors from "../sponsors.js";
import type * as standings from "../standings.js";
import type * as syncSources from "../syncSources.js";
import type * as teams from "../teams.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  adminAuth: typeof adminAuth;
  appSettings: typeof appSettings;
  articles: typeof articles;
  crons: typeof crons;
  documents: typeof documents;
  "facebook/mutations": typeof facebook_mutations;
  "facebook/queries": typeof facebook_queries;
  "facebook/sync": typeof facebook_sync;
  feed: typeof feed;
  files: typeof files;
  galleries: typeof galleries;
  liveStreams: typeof liveStreams;
  matches: typeof matches;
  matchesSync: typeof matchesSync;
  pages: typeof pages;
  people: typeof people;
  seed: typeof seed;
  settings: typeof settings;
  slugify: typeof slugify;
  "sources/encoding": typeof sources_encoding;
  "sources/ninetyMinut": typeof sources_ninetyMinut;
  "sources/polishTime": typeof sources_polishTime;
  "sources/virium": typeof sources_virium;
  sponsors: typeof sponsors;
  standings: typeof standings;
  syncSources: typeof syncSources;
  teams: typeof teams;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
