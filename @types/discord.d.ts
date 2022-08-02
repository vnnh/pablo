import {
	APIApplicationCommandInteractionDataAttachmentOption,
	APIApplicationCommandInteractionDataBooleanOption,
	APIApplicationCommandInteractionDataChannelOption,
	APIApplicationCommandInteractionDataIntegerOption,
	APIApplicationCommandInteractionDataMentionableOption,
	APIApplicationCommandInteractionDataNumberOption,
	APIApplicationCommandInteractionDataRoleOption,
	APIApplicationCommandInteractionDataStringOption,
	APIApplicationCommandInteractionDataSubcommandGroupOption,
	APIApplicationCommandInteractionDataSubcommandOption,
	APIApplicationCommandInteractionDataUserOption,
	APIChatInputApplicationCommandInteractionData,
	ApplicationCommandOptionType,
} from "discord-api-types/v10";

type OptionToType = {
	[ApplicationCommandOptionType.Attachment]: APIApplicationCommandInteractionDataAttachmentOption;
	[ApplicationCommandOptionType.Boolean]: APIApplicationCommandInteractionDataBooleanOption;
	[ApplicationCommandOptionType.Channel]: APIApplicationCommandInteractionDataChannelOption;
	[ApplicationCommandOptionType.Integer]: APIApplicationCommandInteractionDataIntegerOption;
	[ApplicationCommandOptionType.Mentionable]: APIApplicationCommandInteractionDataMentionableOption;
	[ApplicationCommandOptionType.Number]: APIApplicationCommandInteractionDataNumberOption;
	[ApplicationCommandOptionType.Role]: APIApplicationCommandInteractionDataRoleOption;
	[ApplicationCommandOptionType.String]: APIApplicationCommandInteractionDataStringOption;
	[ApplicationCommandOptionType.Subcommand]: APIApplicationCommandInteractionDataSubcommandOption;
	[ApplicationCommandOptionType.SubcommandGroup]: APIApplicationCommandInteractionDataSubcommandGroupOption;
	[ApplicationCommandOptionType.User]: APIApplicationCommandInteractionDataUserOption;
};

export type NamedInteractionOption<
	OptionType extends ApplicationCommandOptionType,
	Name extends string,
> = OptionToType[OptionType] & { name: Name };

export type NamedInteractionGroupOption<
	SubcommandName extends string,
	Options extends Array<NamedInteractionOption>,
> = APIApplicationCommandInteractionDataSubcommandGroupOption & {
	options: [
		Omit<APIApplicationCommandInteractionDataSubcommandOption, "options"> & {
			name: SubcommandName;
			options: Options;
		},
	];
};

export type InteractionData = Omit<APIChatInputApplicationCommandInteractionData, "options">;
