//https://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb?page=1&tab=votes#tab-top
const hexToRgb = (hex: string) => {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	return result
		? {
				r: parseInt(result[1], 16),
				g: parseInt(result[2], 16),
				b: parseInt(result[3], 16),
		  }
		: null;
};

//https://stackoverflow.com/questions/3942878/how-to-decide-font-color-in-white-or-black-depending-on-background-color
export default (hex: string) => {
	const rgbContainer = hexToRgb(hex);
	if (!rgbContainer) {
		return "#ffffffff";
	}

	if (rgbContainer.r * 0.299 + rgbContainer.g * 0.587 + rgbContainer.b * 0.114 > 186) {
		return "#000000ff";
	} else {
		return "#ffffffff";
	}
};
