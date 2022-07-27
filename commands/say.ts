import badwords from "bad-words";
import tinyCharacters from "../modules/characters";
import { api } from "../constant";
import {
	APIApplicationCommandInteractionDataBooleanOption,
	APIApplicationCommandInteractionDataStringOption,
	APIBaseInteraction,
	APIChatInputApplicationCommandInteractionData,
	APIInteractionResponse,
	InteractionResponseType,
	InteractionType,
	MessageFlags,
	RESTPostAPIChannelMessageJSONBody,
} from "discord-api-types/v10";
import { authHeader } from "../modules/env";
import { fetch } from "../modules/fetch";

const filter = new badwords({ placeHolder: "#" });
filter.removeWords("balls", "ball");

export default async (
	interaction: APIBaseInteraction<
		InteractionType.ApplicationCommand,
		APIChatInputApplicationCommandInteractionData & {
			options: Array<
				APIApplicationCommandInteractionDataStringOption | APIApplicationCommandInteractionDataBooleanOption
			>;
		}
	>,
) => {
	let text = interaction.data.options![0].value as string;
	text = text.replace("@everyone", "");
	text = filter.clean(text);
	if (interaction.data.options![1]?.value === true)
		text = text
			.split("")
			.map((a) => tinyCharacters.get(a) ?? a)
			.join("");

	await fetch(`${api}/interactions/${interaction.id}/${interaction.token}/callback`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			type: InteractionResponseType.ChannelMessageWithSource,
			data: { content: "Sent", flags: MessageFlags.Ephemeral },
		} as APIInteractionResponse),
	});

	await fetch(`${api}/channels/${interaction.channel_id}/messages`, {
		method: "POST",
		headers: { "Content-Type": "application/json", ...authHeader },
		body: JSON.stringify({ content: text } as RESTPostAPIChannelMessageJSONBody),
	});
};
