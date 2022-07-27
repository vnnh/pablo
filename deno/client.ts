// @ts-nocheck deno

import config from "./env.ts";
import { Client } from "https://deno.land/x/harmony@v2.6.0/mod.ts";

const client = new Client();
client.connect(config["BOT_TOKEN"], ["GUILDS", "GUILD_MESSAGES"]);

export default client;
