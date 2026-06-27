// Server-fn wrapper around the Mood-Map agent core. Lets the app run the agents
// on demand; the same core also runs on a schedule via scripts/run-agents.ts.
import { createServerFn } from "@tanstack/react-start";
import { runAgents, type MoodAgentResult } from "./signals-core";

export type {
  MoodAgentResult, RedditItem, ReviewItem, TrendItem, DiscordItem, YouTubeItem, Sentiment,
} from "./signals-core";

export const runMoodAgents = createServerFn({ method: "POST" }).handler(
  (): Promise<MoodAgentResult> => runAgents(),
);
