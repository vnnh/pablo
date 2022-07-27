import {
	APIBaseInteraction,
	APIChatInputApplicationCommandInteractionData,
	InteractionType,
} from "discord-api-types/v10";
import say from "./say";

const map = new Map<
	string,
	(
		interactionPayload: APIBaseInteraction<
			InteractionType.ApplicationCommand,
			APIChatInputApplicationCommandInteractionData
		>,
	) => Promise<object | void>
>([["say", say]]);

export default map;
