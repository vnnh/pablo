import nacl from "tweetnacl";
import config from "../modules/env";
import commands from "../commands";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
	APIBaseInteraction,
	APIChatInputApplicationCommandInteractionData,
	InteractionType,
} from "discord-api-types/v10";

const hexToUint8Array = (hex: string) => new Uint8Array(hex.match(/.{1,2}/g)!.map((val) => parseInt(val, 16)));

const verifySignature = async (request: VercelRequest): Promise<{ valid: boolean; body: string }> => {
	const signature = request.headers["x-signature-ed25519"] as string;
	const timestamp = request.headers["x-signature-timestamp"];
	const body = request.body;

	const valid = nacl.sign.detached.verify(
		new TextEncoder().encode(timestamp + body),
		hexToUint8Array(signature),
		hexToUint8Array(config["BOT_PUBLIC"]),
	);

	return { valid, body };
};

export default async (request: VercelRequest, response: VercelResponse) => {
	const { valid, body } = await verifySignature(request);
	if (!valid) {
		response.status(401).send("Invalid request");
		return;
	}

	const interaction: APIBaseInteraction<InteractionType, APIChatInputApplicationCommandInteractionData> =
		JSON.parse(body);
	if (interaction.type === InteractionType.Ping) {
		response.status(200).send({ type: InteractionType.Ping });
	}

	if (interaction.type === InteractionType.ApplicationCommand) {
		const handler = commands.get(interaction.data.name);

		const ret = await handler!(
			interaction as APIBaseInteraction<
				InteractionType.ApplicationCommand,
				APIChatInputApplicationCommandInteractionData
			>,
		);
		if (ret) return response.status(200).send(ret);

		return response.status(200);
	}

	return response.status(400).send("Bad request");
};
