import { APIBaseInteraction, ApplicationCommandOptionType, InteractionType } from "discord-api-types/v10";
import { InteractionData, NamedInteractionOption } from "../@types/discord";

type ArrayElement<ArrayType extends Array<unknown>> = ArrayType extends Array<infer ElementType> ? ElementType : never;

type Extract<T, U> = T extends U ? T : never;

export default <
	Data extends InteractionData & { options: Array<NamedInteractionOption<ApplicationCommandOptionType, string>> },
	Name extends ArrayElement<Data["options"]>["name"],
	OptionType extends Extract<ArrayElement<Data["options"]>, { name: Name }>,
>(
	interactionData: APIBaseInteraction<InteractionType.ApplicationCommand, Data>["data"],
	name: Name,
): { result: "success" | "error"; option: OptionType } => {
	const option = interactionData.options.find((v) => v.name === name) as OptionType;

	return { result: option ? "success" : "error", option };
};
