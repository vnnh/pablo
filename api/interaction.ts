import nacl from "tweetnacl";
import envConfig from "../modules/env";
import commands from "../commands";
import { TextEncoder } from "util";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
	APIBaseInteraction,
	APIChatInputApplicationCommandInteractionData,
	InteractionType,
} from "discord-api-types/v10";
import type { Readable } from "node:stream";

export const config = {
	api: { bodyParser: false },
};

const buffer = async (readable: Readable) => {
	const chunks = [];
	for await (const chunk of readable) {
		chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
	}

	return Buffer.concat(chunks);
};

const hexToUint8Array = (hex: string) => new Uint8Array(hex.match(/.{1,2}/g)!.map((val) => parseInt(val, 16)));

const verifySignature = async (request: VercelRequest): Promise<boolean> => {
	const signature = request.headers["x-signature-ed25519"] as string;
	const timestamp = request.headers["x-signature-timestamp"];

	const buf = await buffer(request);
	const rawBody = buf.toString("utf8");

	const valid = nacl.sign.detached.verify(
		new TextEncoder().encode(timestamp + rawBody),
		hexToUint8Array(signature),
		hexToUint8Array(envConfig["BOT_PUBLIC"]!),
	);

	return valid;
};

export default async (request: VercelRequest, response: VercelResponse) => {
	const valid = await verifySignature(request);
	if (!valid) return response.status(401).send("Invalid request");

	const interaction: APIBaseInteraction<InteractionType, APIChatInputApplicationCommandInteractionData> =
		request.body;
	if (interaction.type === InteractionType.Ping) return response.status(200).send({ type: InteractionType.Ping });

	if (interaction.type === InteractionType.ApplicationCommand) {
		const handler = commands.get(interaction.data!.name);

		const ret = await handler!(
			interaction as APIBaseInteraction<
				InteractionType.ApplicationCommand,
				APIChatInputApplicationCommandInteractionData
			>,
		);
		if (ret) return response.status(200).send(ret);

		return response.status(200).send("Success");
	}

	return response.status(400).send("Bad request");
};
