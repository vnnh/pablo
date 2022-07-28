import {
	APIBaseInteraction,
	APIChatInputApplicationCommandInteractionData,
	APIInteractionResponse,
	ApplicationCommandOptionType,
	InteractionResponseType,
	InteractionType,
	RESTPatchAPIWebhookWithTokenMessageJSONBody,
} from "discord-api-types/v10";
import { NamedInteractionGroupOption, NamedInteractionOption } from "../@types/discord";
import { resolve, join } from "path";
import { readFileSync } from "fs";
import { api } from "../constant";
import { getFileBuffer } from "../modules/image";
import getFromOptions from "../modules/getFromOptions";
import contrastColor from "../modules/contrastColor";
import validateHex from "../modules/validateHex";
import { decode, Frame, GIF, Image } from "imagescript";
import encodeHex, { cleanHex } from "../modules/encodeHex";
import FormData from "form-data";
import fetch from "node-fetch";

type CaptionPosition = "top" | "center" | "bottom";

let fontBuffer: ArrayBufferLike = undefined!;

const editResponse = async (
	interaction: APIBaseInteraction<InteractionType.ApplicationCommand, unknown>,
	body: string,
) => {
	await fetch(`${api}/webhooks/${interaction.application_id}/${interaction.token}/messages/@original`, {
		method: "PATCH",
		headers: { "Content-Type": "application/json" },
		body,
	});

	return undefined;
};

const placeComposite = (main: Image, input: Image, text: Image, position: CaptionPosition, isOverlay: boolean) => {
	if (position === "top") {
		main.composite(input, 0, isOverlay ? 0 : text.height).composite(text, 0, 0);
	} else if (position === "bottom") {
		main.composite(input, 0, 0).composite(text, 0, isOverlay ? input.height - text.height : input.height);
	} else if (position === "center") {
		main.composite(input, 0, 0).composite(text, 0, input.height / 2 - text.height / 2);
	}
	return main;
};

//interaction.data.name: GROUP
//interaction.data.options: [{ "name": SUBCOMMAND,"options": [...] }]
export default async <InteractionData extends APIChatInputApplicationCommandInteractionData>(
	interaction: APIBaseInteraction<
		InteractionType.ApplicationCommand,
		Omit<InteractionData, "options"> &
			(
				| NamedInteractionGroupOption<
						"caption",
						[
							NamedInteractionOption<ApplicationCommandOptionType.Attachment, "file">,
							NamedInteractionOption<ApplicationCommandOptionType.String, "url">,
							NamedInteractionOption<ApplicationCommandOptionType.String, "text">,
							NamedInteractionOption<ApplicationCommandOptionType.Boolean, "overlay">,
							NamedInteractionOption<ApplicationCommandOptionType.String, "position">,
							NamedInteractionOption<ApplicationCommandOptionType.String, "color">,
						]
				  >
				| NamedInteractionGroupOption<
						"rotate",
						[
							NamedInteractionOption<ApplicationCommandOptionType.Attachment, "file">,
							NamedInteractionOption<ApplicationCommandOptionType.String, "url">,
							NamedInteractionOption<ApplicationCommandOptionType.Number, "angle">,
						]
				  >
			)
	>,
) => {
	await fetch(`${api}/interactions/${interaction.id}/${interaction.token}/callback`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			type: InteractionResponseType.DeferredChannelMessageWithSource,
		} as APIInteractionResponse),
	});

	const subcommand = interaction.data!.options[0];

	const source = getFromOptions(subcommand, "url") ?? getFromOptions(subcommand, "file");
	if (!source)
		return await editResponse(
			interaction,
			JSON.stringify({
				content: "> No image source found!",
			} as RESTPatchAPIWebhookWithTokenMessageJSONBody),
		);

	const fileBuffer = await getFileBuffer(
		source.type === ApplicationCommandOptionType.Attachment
			? interaction.data?.resolved?.attachments?.[source.value]?.url
			: source.value,
		interaction.channel_id!,
	);
	if (!(fileBuffer instanceof ArrayBuffer))
		return await editResponse(
			interaction,
			JSON.stringify({
				content: fileBuffer ?? "> Error",
			} as RESTPatchAPIWebhookWithTokenMessageJSONBody),
		);

	let encoded: Uint8Array | undefined;
	let ext: "gif" | "png" = "png";
	if (subcommand.name === "caption") {
		if (fontBuffer === undefined)
			fontBuffer = readFileSync(join(resolve(process.cwd(), "static"), "Impact.ttf")).buffer;

		const text = getFromOptions(subcommand, "text");
		const isOverlay = getFromOptions(subcommand, "overlay")?.value ?? true;
		const position = (getFromOptions(subcommand, "position")?.value ?? "top") as CaptionPosition;
		const color = getFromOptions(subcommand, "color")?.value ?? "#fff | #000";

		let textColor = "";
		let backgroundColor = "";
		{
			const textMatch = cleanHex(color.match(/(#[0-9A-Fa-f]{8}|#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3})\s?\|?/)?.[1]);
			const backgroundMatch = cleanHex(
				color.match(/\|\s?(#[0-9A-Fa-f]{8}|#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3})/)?.[1],
			);
			if (textMatch && !backgroundMatch) {
				textColor = textMatch.length === 6 ? `${textMatch}ff` : textMatch;
				backgroundColor = contrastColor(textColor);
			} else if (backgroundMatch && !textMatch) {
				backgroundColor = backgroundMatch.length === 6 ? `${backgroundMatch}ff` : backgroundMatch;
				textColor = contrastColor(backgroundColor);
			} else if (textMatch && backgroundMatch) {
				textColor = textMatch.length === 6 ? `${textMatch}ff` : textMatch;
				backgroundColor = backgroundMatch.length === 6 ? `${backgroundMatch}ff` : backgroundMatch;
			}
		}

		if (!validateHex(textColor) || !validateHex(backgroundColor))
			return await editResponse(
				interaction,
				JSON.stringify({
					content: "> Invalid hex!",
				} as RESTPatchAPIWebhookWithTokenMessageJSONBody),
			);

		if (!text)
			return await editResponse(
				interaction,
				JSON.stringify({
					content: "> No caption text given!",
				} as RESTPatchAPIWebhookWithTokenMessageJSONBody),
			);

		const inputImage = await decode(Buffer.from(fileBuffer));
		const textImage = await Image.renderText(Buffer.from(fontBuffer), 24, text.value, encodeHex(textColor), {
			maxWidth: inputImage.width,
			maxHeight: Infinity,
			wrapStyle: "word",
			verticalAlign: "center",
			horizontalAlign: "center",
			wrapHardBreaks: true,
		});

		const blankImage = new Image(
			inputImage.width,
			inputImage.height + (isOverlay || position === "center" ? 0 : textImage.height),
		).fill(encodeHex(backgroundColor));

		if (inputImage instanceof GIF) {
			for (const [i, v] of inputImage.entries()) {
				inputImage[i] = Frame.from(
					placeComposite(blankImage.clone(), v as unknown as Image, textImage, position, isOverlay),
				);
			}

			encoded = await inputImage.encode(100);
			ext = "gif";
		} else {
			encoded = await placeComposite(blankImage, inputImage, textImage, position, isOverlay).encode();
		}
	} else if (subcommand.name === "rotate") {
		const angle = getFromOptions(subcommand, "angle")?.value;
		if (angle === undefined)
			return await editResponse(
				interaction,
				JSON.stringify({
					content: "> No angle given!",
				} as RESTPatchAPIWebhookWithTokenMessageJSONBody),
			);

		const inputImage = await decode(Buffer.from(fileBuffer));
		if (inputImage instanceof GIF) {
			for (const [i, v] of inputImage.entries()) {
				inputImage[i] = Frame.from((v as Frame).rotate(angle));
			}

			encoded = await inputImage.encode(100);
			ext = "gif";
		} else {
			encoded = await inputImage.rotate(angle).encode();
		}
	}

	if (encoded) {
		const formData = new FormData();

		const filename = `new.${ext}`;
		formData.append(
			"payload_json",
			JSON.stringify({
				attachments: [
					{
						id: "0",
						description: "modified image",
						filename,
					},
				],
			} as RESTPatchAPIWebhookWithTokenMessageJSONBody),
		);
		formData.append("files[0]", Buffer.from(encoded.buffer), { filename });

		await fetch(`${api}/webhooks/${interaction.application_id}/${interaction.token}/messages/@original`, {
			method: "PATCH",
			headers: formData.getHeaders(),
			body: formData,
		});
	}
};
