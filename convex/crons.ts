import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "sync facebook posts",
  { minutes: 5 },
  internal.facebook.sync.syncFromFacebook,
);

crons.interval(
  "sync match results",
  { hours: 6 },
  internal.matchesSync.syncAll,
  {},
);

export default crons;
