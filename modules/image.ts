import { authHeader } from "./env";
import { api } from "../constant";
import {
	APIApplicationCommandInteractionDataAttachmentOption,
	APIApplicationCommandInteractionDataStringOption,
	APIChatInputApplicationCommandInteraction,
	APIMessage,
	ApplicationCommandOptionType,
} from "discord-api-types/v10";

export const getFileInput = (interaction: APIChatInputApplicationCommandInteraction) => {
	const option = interaction.data.options!.find((v) => /(?:file)|(?:url)/.test(v.name)) as
		| APIApplicationCommandInteractionDataAttachmentOption
		| APIApplicationCommandInteractionDataStringOption
		| undefined;

	if (option?.type === ApplicationCommandOptionType.Attachment) {
		return interaction.data.resolved?.attachments?.[option.value].url;
	} else if (option?.type === ApplicationCommandOptionType.String) {
		return option.value;
	}
};

export const getFileBuffer = async (fileInput: string, channelId: string) => {
	let messageBuffer: ArrayBuffer | undefined;

	let messageId;

	if (typeof fileInput === "string") {
		if (fileInput.match("discord.com")) {
			messageId = fileInput.match(/\/(\d+)\/(\d+)$/);
			if (!messageId) {
				return "> Message not found!";
			}

			channelId = messageId[1];
			messageId = messageId[2];
		} else if (fileInput.match("http")) {
			if (fileInput.match("/tenor") || fileInput.match("/gyazo")) {
				messageBuffer = await fetch(`${fileInput}.gif`).then((v) => v.arrayBuffer());
			} else {
				messageBuffer = await fetch(fileInput).then((v) => v.arrayBuffer());
			}
		} else {
			messageId = fileInput;
		}
	}

	if (messageId) {
		let channelMessageResponse;
		try {
			channelMessageResponse = await fetch(`${api}/channels/${channelId}/messages/${messageId}`, {
				headers: authHeader,
			});
		} catch (_e) {
			return "> Message not found!";
		}

		if (channelMessageResponse) {
			const channelMessage = (await channelMessageResponse.json()) as APIMessage;

			if (channelMessage.attachments.length === 0) {
				if (channelMessage.content.match("/tenor") || channelMessage.content.match("/gyazo")) {
					messageBuffer = await fetch(`${channelMessage.content}.gif`).then((v) => v.arrayBuffer());
				} else if (
					channelMessage.content.match("media.discord") ||
					channelMessage.content.match("cdn.discord")
				) {
					const urlMatch = channelMessage.content.match(
						// eslint-disable-next-line no-useless-escape
						/(https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*))/g,
					);
					if (!urlMatch) {
						return "> Message has no attachments or URLs!";
					}

					messageBuffer = await fetch(`${urlMatch[0]}`).then((v) => v.arrayBuffer());
				} else {
					return "> Message has no attachments!";
				}
			} else {
				messageBuffer = await fetch(channelMessage.attachments[0].url).then((v) => v.arrayBuffer());
			}
		}
	}

	return messageBuffer;
};
