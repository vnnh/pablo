import { authHeader } from "./env";
import { api } from "../constant";
import { APIMessage } from "discord-api-types/v10";
import fetch from "node-fetch";

export const getFileBuffer = async (fileInput: string | undefined, channelId: string) => {
	if (fileInput === undefined) return "> Error retrieving input";

	let messageBuffer: ArrayBuffer | undefined;

	let messageId;

	if (fileInput.match("discord.com")) {
		messageId = fileInput.match(/\/(\d+)\/(\d+)\/(\d+)$/) ?? fileInput.match(/\/(\d+)\/(\d+)$/);
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

			if (!channelMessage.attachments || channelMessage.attachments.length === 0) {
				console.log(JSON.stringify(channelMessage));
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
