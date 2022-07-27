// @ts-nocheck deno

import { config as configCreator } from "https://deno.land/std/dotenv/mod.ts";

const config = await configCreator();

if (!config["BOT_TOKEN"]) {
	config["BOT_TOKEN"] = Deno.env.get("BOT_TOKEN")!;
}

if (!config["BOT_PUBLIC"]) {
	config["BOT_PUBLIC"] = Deno.env.get("BOT_PUBLIC")!;
}

export default config;
export const authHeader = { Authorization: `Bot ${config["BOT_TOKEN"]}` };
