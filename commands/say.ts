import badwords from "bad-words";
import tinyCharacters from "../modules/characters";
import { api } from "../constant";
import {
	APIBaseInteraction,
	APIInteractionResponse,
	ApplicationCommandOptionType,
	InteractionResponseType,
	InteractionType,
	MessageFlags,
	RESTPostAPIChannelMessageJSONBody,
} from "discord-api-types/v10";
import { authHeader } from "../modules/env";
import fetch from "node-fetch";
import { InteractionData, NamedInteractionOption } from "../@types/discord";
import getFromOptions from "../modules/getFromOptions";
import FormData from "form-data";

const filter = new badwords({ placeHolder: "#" });
filter.removeWords("balls", "ball");

export default async (
	interaction: APIBaseInteraction<
		InteractionType.ApplicationCommand,
		Omit<InteractionData, "options"> & {
			options: [
				NamedInteractionOption<ApplicationCommandOptionType.String, "message">,
				NamedInteractionOption<ApplicationCommandOptionType.Boolean, "tiny">,
				NamedInteractionOption<ApplicationCommandOptionType.Attachment, "attachment">,
			];
		}
	>,
) => {
	let text = "";
	const messageOption = getFromOptions(interaction.data, "message");
	if (messageOption) text = messageOption.value;
	text = text.replace("@everyone", "");
	text = filter.clean(text);

	const tinyOption = getFromOptions(interaction.data, "tiny");
	if (tinyOption?.value === true)
		text = text
			.split("")
			.map((a) => tinyCharacters.get(a) ?? a)
			.join("");

	const attachmentOption = getFromOptions(interaction.data, "attachment");
	const attachmentObject = interaction.data?.resolved?.attachments?.[attachmentOption?.value ?? ""];

	await fetch(`${api}/interactions/${interaction.id}/${interaction.token}/callback`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			type: InteractionResponseType.ChannelMessageWithSource,
			data: { content: "Sent", flags: MessageFlags.Ephemeral },
		} as APIInteractionResponse),
	});

	if (!attachmentObject) {
		await fetch(`${api}/channels/${interaction.channel_id}/messages`, {
			method: "POST",
			headers: { "Content-Type": "application/json", ...authHeader },
			body: JSON.stringify({ content: text } as RESTPostAPIChannelMessageJSONBody),
		});
	} else {
		const attachmentBuffer = await fetch(attachmentObject.url).then((v) => v.arrayBuffer());

		const formData = new FormData();

		formData.append(
			"payload_json",
			JSON.stringify({
				content: text,
				attachments: [
					{
						id: "0",
						filename: attachmentObject.filename,
						description: attachmentObject.description,
					},
				],
			} as RESTPostAPIChannelMessageJSONBody),
		);
		formData.append("files[0]", Buffer.from(attachmentBuffer), { filename: attachmentObject.filename });

		await fetch(`${api}/channels/${interaction.channel_id}/messages`, {
			method: "PATCH",
			headers: { ...authHeader, ...formData.getHeaders() },
			body: formData,
		});
	}
};
