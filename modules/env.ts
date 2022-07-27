const config = process.env;

export default config;
export const authHeader = { Authorization: `Bot ${config["BOT_TOKEN"]}` };
