export default (str: string) => {
	if (str.length === 3) {
		str = str.replace(/([A-Fa-f0-9])([A-Fa-f0-9])([A-Fa-f0-9])/, "$1$1$2$2$3$3");
	}

	const match = str.match(/^[A-Fa-f0-9]{6}/);
	return parseInt(match?.[1] ?? "ffffff", 16);
};
