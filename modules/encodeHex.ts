export default (str: string) => {
	const match = str.replace(/^#/, "").match(/^[A-Fa-f0-9]{0,6}/);
	return parseInt(match?.[1] ?? "fff", 16);
};
