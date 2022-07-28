import { APIBaseInteraction, InteractionType } from "discord-api-types/v10";
import say from "./say";
import image from "./image";
import { InteractionData } from "../@types/discord";

const map = new Map<
	string,
	(
		interactionPayload: APIBaseInteraction<InteractionType.ApplicationCommand, InteractionData>,
	) => Promise<object | void>
>([
	["say", say],
	["image", image],
] as never);

export default map;
