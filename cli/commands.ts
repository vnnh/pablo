// @ts-nocheck deno

//deno run --allow-write --allow-read --allow-net --allow-env ./cli/commands.ts

import config from "../modules/env.ts";
import {
	ApplicationCommandOptionType,
	ApplicationCommandPartial,
	Client,
	event,
} from "https://deno.land/x/harmony/mod.ts";

const ATTACHMENT = 11;

const applicationCommands: Array<ApplicationCommandPartial> = [
	{
		name: "say",
		description: "say something naughty",
		options: [
			{
				name: "message",
				description: "the message",
				required: true,
				type: ApplicationCommandOptionType.STRING,
			},
			{
				name: "tiny",
				description: "use tiny characters",
				required: false,
				type: ApplicationCommandOptionType.BOOLEAN,
			},
		],
	},
	{
		name: "image",
		description: "image manipulation",
		options: [
			{
				name: "caption",
				description: "caption an image",
				type: ApplicationCommandOptionType.SUB_COMMAND,
				options: [
					{
						name: "file",
						description: "input option 1",
						type: ATTACHMENT,
					},
					{
						name: "url",
						description: "input option 2",
						type: ApplicationCommandOptionType.STRING,
					},
					{
						name: "text",
						description: "the caption",
						type: ApplicationCommandOptionType.STRING,
					},
					{
						name: "overlay",
						description: "overlay the caption onto the image",
						type: ApplicationCommandOptionType.BOOLEAN,
					},
					{
						name: "position",
						description: "the position",
						choices: [
							{ name: "top", value: "top" },
							{ name: "center", value: "center" },
							{ name: "bottom", value: "bottom" },
						],
						type: ApplicationCommandOptionType.STRING,
					},
					{
						name: "color",
						description: "text | background",
						type: ApplicationCommandOptionType.STRING,
					},
				],
			},
			{
				name: "rotate",
				description: "rotate an image",
				type: ApplicationCommandOptionType.SUB_COMMAND,
				options: [
					{
						name: "file",
						description: "input option 1",
						type: ATTACHMENT,
					},
					{
						name: "url",
						description: "input option 2",
						type: ApplicationCommandOptionType.STRING,
					},
					{
						name: "degrees",
						description: "degree to rotate",
						type: ApplicationCommandOptionType.NUMBER,
					},
				],
			},
		],
	},
];

export class PabloClient extends Client {
	@event()
	async ready(): Promise<void> {
		console.log(`Logged in as ${this.user?.tag}`);
		//const commands = await this.interactions.commands.all();
		//if (commands.size !== 2) {
		await this.interactions.commands.bulkEdit(applicationCommands);
		//}
	}
}

const client = new PabloClient();
client.connect(config["BOT_TOKEN"], []);
