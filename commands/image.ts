import {
	APIBaseInteraction,
	APIChatInputApplicationCommandInteractionData,
	ApplicationCommandOptionType,
	InteractionType,
} from "discord-api-types/v10";
import { NamedInteractionGroupOption, NamedInteractionOption } from "../@types/discord";

export default async <InteractionData extends APIChatInputApplicationCommandInteractionData>(
	interaction: APIBaseInteraction<
		InteractionType.ApplicationCommand,
		InteractionData & {
			options: [
				NamedInteractionGroupOption<
					"caption",
					[NamedInteractionOption<ApplicationCommandOptionType.String, "url">]
				>,
			];
		}
	>,
) => {
	console.log(interaction.data.name);
	console.log(JSON.stringify(interaction.data.options));

	return { content: "placeholder" };
};
