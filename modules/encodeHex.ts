export const cleanHex = <Hex extends unknown>(hex: Hex): Hex => {
	if (typeof hex === "string") {
		hex = hex.replace(/^#/, "") as Hex;
		if ((hex as string).length === 3) {
			return (hex as string).replace(/([A-Fa-f0-9])([A-Fa-f0-9])([A-Fa-f0-9])/, "$1$1$2$2$3$3") as Hex;
		}
	}

	return hex;
};

export default (str: string) => {
	const match = str.match(/^[A-Fa-f0-9]{8}/);
	return parseInt(match?.[0] ?? "ffffffff", 16);
};
