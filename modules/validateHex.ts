export default (hex: string | number) => {
	if (typeof hex === "number") {
		hex = hex.toString();
	}

	return /(?:^#[0-9A-Fa-f]{8})|(?:^#[0-9A-Fa-f]{6})$/i.test(hex);
};
