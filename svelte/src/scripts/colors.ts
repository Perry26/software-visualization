import {distributedCopy} from '$helper';
import colourMap from 'colormap';
//@ts-ignore
import * as colorMapPallets from 'colormap/colorScale.js';
import Color from 'colorjs.io';

/** Convert a 3-digit hexadecimal color to a 6-digit hexadecimal color
 */
function to6hex(hex: string): string {
	if (hex.length === 7) {
		return hex;
	}
	if (hex.length === 4) {
		return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
	}
	throw new Error(`Invalid colour: ${hex} is not a colour`);
}

/** Generates a node color pallet for DrawSettings, given the amount of layers */
export function getNodeColors(
	nrNodes: number,
	colorScheme: string,
	colorSchemeSettings: {
		inverted: boolean;
		increaseBrightness: boolean;
		increaseSaturation: boolean;
	},
) {
	if (!colorPallets.includes(colorScheme)) {
		throw new Error(
			`Invalid colorscheme passed to getColors: ${colorScheme} passed in, known schemes are ${colorPallets}`,
		);
	}
	const minimumSize: number = colorMapPallets[colorScheme].length;

	// Get colour pallets
	const hexColors = distributedCopy(
		colourMap({
			colormap: colorScheme,
			nshades: Math.max(nrNodes + 1, minimumSize),
			format: 'hex',
			alpha: 1,
		}),
		nrNodes + 1,
	);

	if (colorSchemeSettings.inverted) {
		hexColors.reverse();
	}

	let minL = Infinity;
	let minS = Infinity;
	const colors = hexColors.map((hex, i) => {
		const c = new Color(hex);
		if (colorSchemeSettings.increaseBrightness) {
			c.hsl.l = minL = Math.min(minL, c.hsl.l) - i / c.hsl.l;
		}
		if (colorSchemeSettings.increaseSaturation) {
			c.hsl.s = minS = Math.min(minS, c.hsl.s) - i / c.hsl.s;
		}

		return c;
	});

	const defaultColor = colors[Math.floor(hexColors.length / 2)];
	defaultColor.hsl.h = (360 - defaultColor.hsl.h) % 360;

	return {
		nodeColors: colors.map(c => {
			const res = c.toString({format: 'hex'});
			console.log(c.hsl.s);
			return to6hex(res);
		}),
		nodeDefaultColor: to6hex(defaultColor.toString({format: 'hex'})),
	};
}

/**
 * List of all available colour pallets
 * Color pallets are provided by the library colorMapPallets
 * */
export const colorPallets: string[] = Object.keys(colorMapPallets);
