// @ts-nocheck deno

//deno run --allow-all ./cli/commands.ts

import config from "../deno/env.ts";
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
				type: ApplicationCommandOptionType.STRING,
			},
			{
				name: "tiny",
				description: "use tiny characters",
				type: ApplicationCommandOptionType.BOOLEAN,
			},
			{
				name: "attachment",
				description: "input option",
				type: ATTACHMENT,
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
				name: "watermark",
				description: "watermark an image",
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
						name: "type",
						description: "the watermark type",
						type: ApplicationCommandOptionType.STRING,
						choices: [
							{ name: "getty", value: "getty" },
							{ name: "shutterstock", value: "shutterstock" },
							{ name: "sample", value: "sample" },
							{ name: "bandicam", value: "bandicam" },
						],
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
						name: "angle",
						description: "degrees",
						type: ApplicationCommandOptionType.NUMBER,
					},
				],
			},
			{
				name: "round",
				description: "round an image",
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
						name: "radius",
						description: "corner radius (w=width | h=height)",
						type: ApplicationCommandOptionType.STRING,
					},
				],
			},
			{
				name: "invert",
				description: "invert an attribute of an image",
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
						name: "attribute",
						description: "image attribute (hue = color, saturation = intensity, value = lightness)",
						type: ApplicationCommandOptionType.STRING,
						choices: [
							{ name: "color", value: "color" },
							{ name: "hue", value: "hue" },
							{ name: "saturation", value: "saturation" },
							{ name: "value", value: "value" },
						],
					},
				],
			},
			{
				name: "saturate",
				description: "saturate an image",
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
						name: "saturation",
						description: "0-1",
						type: ApplicationCommandOptionType.NUMBER,
						minValue: 0,
						maxValue: 1,
					},
					{
						name: "channel",
						description: "color channel",
						type: ApplicationCommandOptionType.STRING,
						choices: [
							{ name: "all", value: "all" },
							{ name: "red", value: "red" },
							{ name: "green", value: "green" },
							{ name: "blue", value: "blue" },
						],
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
