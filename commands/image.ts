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
import Mexp from "math-expression-evaluator";

type CaptionPosition = "top" | "center" | "bottom";
type InvertAttribute = "color" | "hue" | "saturation" | "value";
type SaturateChannel = "all" | "red" | "green" | "blue";

let cachedBuffers: Partial<{
	impact: Buffer;
	block: Buffer;

	shutterstock: Buffer;
	getty: Buffer;
	sample: Buffer;
	bandicam: Buffer;
}> = {};

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

const invertImage = (image: Image, attr: InvertAttribute) => {
	switch (attr) {
		case "color":
			return image.invert();
		case "hue":
			return image.invertHue();
		case "saturation":
			return image.invertSaturation();
		case "value":
			return image.invertValue();
	}
};

const saturateImage = (image: Image, value: number, channel: SaturateChannel) => {
	switch (channel) {
		case "all":
			return image.saturation(value);
		case "red":
			return image.red(value);
		case "green":
			return image.green(value);
		case "blue":
			return image.blue(value);
	}
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
							Omit<NamedInteractionOption<ApplicationCommandOptionType.String, "position">, "value"> & {
								value: CaptionPosition;
							},
							NamedInteractionOption<ApplicationCommandOptionType.String, "color">,
						]
				  >
				| NamedInteractionGroupOption<
						"watermark",
						[
							NamedInteractionOption<ApplicationCommandOptionType.Attachment, "file">,
							NamedInteractionOption<ApplicationCommandOptionType.String, "url">,
							Omit<NamedInteractionOption<ApplicationCommandOptionType.String, "type">, "value"> & {
								value: "getty" | "shutterstock" | "sample" | "bandicam" | "fps";
							},
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
				| NamedInteractionGroupOption<
						"round",
						[
							NamedInteractionOption<ApplicationCommandOptionType.Attachment, "file">,
							NamedInteractionOption<ApplicationCommandOptionType.String, "url">,
							NamedInteractionOption<ApplicationCommandOptionType.String, "radius">,
						]
				  >
				| NamedInteractionGroupOption<
						"invert",
						[
							NamedInteractionOption<ApplicationCommandOptionType.Attachment, "file">,
							NamedInteractionOption<ApplicationCommandOptionType.String, "url">,
							Omit<NamedInteractionOption<ApplicationCommandOptionType.String, "attribute">, "value"> & {
								value: InvertAttribute;
							},
						]
				  >
				| NamedInteractionGroupOption<
						"saturate",
						[
							NamedInteractionOption<ApplicationCommandOptionType.Attachment, "file">,
							NamedInteractionOption<ApplicationCommandOptionType.String, "url">,
							NamedInteractionOption<ApplicationCommandOptionType.Number, "saturation">,
							Omit<NamedInteractionOption<ApplicationCommandOptionType.String, "channel">, "value"> & {
								value: SaturateChannel;
							},
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
		if (cachedBuffers.impact === undefined)
			cachedBuffers.impact = Buffer.from(
				readFileSync(join(resolve(process.cwd(), "static"), "Impact.ttf")).buffer,
			);

		const text = getFromOptions(subcommand, "text");
		const isOverlay = getFromOptions(subcommand, "overlay")?.value ?? true;
		const position = getFromOptions(subcommand, "position")?.value ?? "top";
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
		const textImage = await Image.renderText(
			cachedBuffers.impact,
			inputImage.width / 24,
			text.value,
			encodeHex(textColor),
			{
				maxWidth: inputImage.width,
				maxHeight: Infinity,
				wrapStyle: "word",
				verticalAlign: "center",
				horizontalAlign: "center",
				wrapHardBreaks: true,
			},
		);

		const blankImage = new Image(
			inputImage.width,
			inputImage.height + (isOverlay || position === "center" ? 0 : textImage.height),
		).fill(encodeHex(backgroundColor));

		if (inputImage instanceof GIF) {
			for (const [i, v] of inputImage.entries()) {
				inputImage[i] = Frame.from(
					placeComposite(blankImage.clone(), v as unknown as Image, textImage, position, isOverlay),
					undefined,
					undefined,
					undefined,
					Frame.DISPOSAL_BACKGROUND,
				);
			}

			encoded = await inputImage.encode(100);
			ext = "gif";
		} else {
			encoded = await placeComposite(blankImage, inputImage, textImage, position, isOverlay).encode();
		}
	} else if (subcommand.name === "watermark") {
		const watermarkType = getFromOptions(subcommand, "type")?.value ?? "shutterstock";
		const inputImage = await decode(Buffer.from(fileBuffer));

		let watermarkOverlay: Image;
		if (watermarkType === "sample") {
			if (cachedBuffers[watermarkType] === undefined)
				cachedBuffers[watermarkType] = Buffer.from(
					readFileSync(join(resolve(process.cwd(), "static"), `${watermarkType}.png`)).buffer,
				);

			watermarkOverlay = ((await decode(cachedBuffers[watermarkType]!)) as Image).resize(
				inputImage.width >= inputImage.height ? inputImage.width : Image.RESIZE_AUTO,
				inputImage.height >= inputImage.width ? inputImage.height : Image.RESIZE_AUTO,
			);
		} else if (watermarkType === "bandicam") {
			if (cachedBuffers[watermarkType] === undefined)
				cachedBuffers[watermarkType] = Buffer.from(
					readFileSync(join(resolve(process.cwd(), "static"), `${watermarkType}.png`)).buffer,
				);

			let watermark = (await decode(cachedBuffers[watermarkType]!)) as Image;
			if (inputImage.width < watermark.width) {
				watermark = watermark.resize(inputImage.width, Image.RESIZE_AUTO);
			}

			watermarkOverlay = new Image(inputImage.width, inputImage.height).composite(
				watermark,
				inputImage.width / 2 - watermark.width / 2,
				0,
			);
		} else if (watermarkType !== "fps") {
			watermarkOverlay = new Image(inputImage.width, inputImage.height);
			let tileWidth = watermarkOverlay.width / 5;
			let tileHeight = watermarkOverlay.height / 5;

			if (cachedBuffers[watermarkType] === undefined)
				cachedBuffers[watermarkType] = Buffer.from(
					readFileSync(join(resolve(process.cwd(), "static"), `${watermarkType}.png`)).buffer,
				);

			const watermarkTemplate = ((await decode(cachedBuffers[watermarkType]!)) as Image)
				.resize(tileWidth, Image.RESIZE_AUTO)
				.rotate(45);

			for (let j = 0; j < 5 + 1; j++) {
				for (let i = 0; i < j + 2; i++) {
					const x = i * (tileWidth * 1.5) - (j * watermarkOverlay.height) / 30;
					const y = j * (tileHeight * 1.5) - i * tileHeight + 10 * j + (j * watermarkOverlay.height) / 20;
					if (x < watermarkOverlay.width && y < watermarkOverlay.height) {
						watermarkOverlay.composite(watermarkTemplate, x, y);
					}
				}
			}
		}

		if (watermarkType !== "fps") {
			if (inputImage instanceof GIF) {
				for (const [i, v] of inputImage.entries()) {
					inputImage[i] = Frame.from(
						(v as Frame).composite(watermarkOverlay!),
						undefined,
						undefined,
						undefined,
						Frame.DISPOSAL_BACKGROUND,
					);
				}

				encoded = await inputImage.encode(100);
				ext = "gif";
			} else {
				encoded = await inputImage.composite(watermarkOverlay!).encode();
			}
		} else {
			if (!(inputImage instanceof GIF)) {
				return await editResponse(
					interaction,
					JSON.stringify({
						content: "> Input is not a GIF!",
					} as RESTPatchAPIWebhookWithTokenMessageJSONBody),
				);
			}

			if (cachedBuffers.block === undefined)
				cachedBuffers.block = Buffer.from(
					readFileSync(join(resolve(process.cwd(), "static"), `Block.ttf`)).buffer,
				);

			let textImages = [];
			for (let i = 0; i < 5; i++) {
				const textImage = await Image.renderText(
					cachedBuffers.block,
					inputImage.width / 24,
					`${58 + i}`,
					encodeHex("eaeb00ff"),
					{
						maxWidth: Infinity,
						maxHeight: Infinity,
						verticalAlign: "center",
						horizontalAlign: "center",
					},
				);
				const watermarkImage = new Image(textImage.width + 6, textImage.height - 4)
					.fill(encodeHex("000000ff"))
					.composite(textImage, 3);

				textImages.push(watermarkImage);
			}

			for (const [i, v] of inputImage.entries()) {
				const textImage = textImages[Math.floor(Math.random() * 4)];
				inputImage[i] = Frame.from(
					(v as Frame).composite(textImage, inputImage.width - textImage.width),
					undefined,
					undefined,
					undefined,
					Frame.DISPOSAL_BACKGROUND,
				);
			}

			encoded = await inputImage.encode(100);
			ext = "gif";
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
				inputImage[i] = Frame.from(
					(v as Frame).rotate(angle),
					undefined,
					undefined,
					undefined,
					Frame.DISPOSAL_BACKGROUND,
				);
			}

			encoded = await inputImage.encode(100);
			ext = "gif";
		} else {
			encoded = await inputImage.rotate(angle).encode();
		}
	} else if (subcommand.name === "round") {
		const radius = getFromOptions(subcommand, "radius")?.value;
		if (radius === undefined)
			return await editResponse(
				interaction,
				JSON.stringify({
					content: "> No radius given!",
				} as RESTPatchAPIWebhookWithTokenMessageJSONBody),
			);

		const inputImage = await decode(Buffer.from(fileBuffer));

		let calculatedRadius: number | undefined;
		try {
			calculatedRadius = Mexp.eval(
				radius,
				[
					{ type: 3, token: "w", show: "w", value: "w" },
					{ type: 3, token: "h", show: "h", value: "h" },
				],
				{ w: inputImage.width, h: inputImage.height },
			) as unknown as number;
		} catch (e) {
			return await editResponse(
				interaction,
				JSON.stringify({
					content: `> ${(e as { message: string }).message}`,
				} as RESTPatchAPIWebhookWithTokenMessageJSONBody),
			);
		}

		if (calculatedRadius === undefined) return;

		if (inputImage instanceof GIF) {
			for (const [i, v] of inputImage.entries()) {
				inputImage[i] = Frame.from(
					(v as Frame).roundCorners(calculatedRadius),
					undefined,
					undefined,
					undefined,
					Frame.DISPOSAL_BACKGROUND,
				);
			}

			encoded = await inputImage.encode(100);
			ext = "gif";
		} else {
			encoded = await inputImage.roundCorners(calculatedRadius).encode();
		}
	} else if (subcommand.name === "invert") {
		const attr = getFromOptions(subcommand, "attribute")?.value ?? "color";

		const inputImage = await decode(Buffer.from(fileBuffer));
		if (inputImage instanceof GIF) {
			for (const [i, v] of inputImage.entries()) {
				inputImage[i] = Frame.from(
					invertImage(v, attr),
					undefined,
					undefined,
					undefined,
					Frame.DISPOSAL_BACKGROUND,
				);
			}

			encoded = await inputImage.encode(100);
			ext = "gif";
		} else {
			encoded = await invertImage(inputImage, attr).encode();
		}
	} else if (subcommand.name === "saturate") {
		const saturationValue = getFromOptions(subcommand, "saturation")?.value;
		if (saturationValue === undefined)
			return await editResponse(
				interaction,
				JSON.stringify({
					content: "> No radius given!",
				} as RESTPatchAPIWebhookWithTokenMessageJSONBody),
			);

		const channel = getFromOptions(subcommand, "channel")?.value ?? "all";
		const inputImage = await decode(Buffer.from(fileBuffer));
		if (inputImage instanceof GIF) {
			for (const [i, v] of inputImage.entries()) {
				inputImage[i] = Frame.from(
					saturateImage(v, saturationValue, channel),
					undefined,
					undefined,
					undefined,
					Frame.DISPOSAL_BACKGROUND,
				);
			}

			encoded = await inputImage.encode(100);
			ext = "gif";
		} else {
			encoded = await saturateImage(inputImage, saturationValue, channel).encode();
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
