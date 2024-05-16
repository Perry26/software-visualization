import {distributedCopy} from '$helper';
import colourMap from 'colormap';
//@ts-ignore
import * as colorMapPallets from 'colormap/colorScale.js';

function invertHex(hex: string) {
	return '#' + (Number(`0x1${hex.substring(1)}`) ^ 0xffffff).toString(16).substr(1).toUpperCase();
}

/** Generates a node color pallet for DrawSettings, given the amount of layers */
export function getNodeColors(nrNodes: number, colorScheme: string, inverted = false) {
	if (!colorPallets.includes(colorScheme)) {
		throw new Error(
			`Invalid colorscheme passed to getColors: ${colorScheme} passed in, known schemes are ${colorPallets}`,
		);
	}
	const minimumSize: number = colorMapPallets[colorScheme].length;

	const nodeColors = distributedCopy(
		colourMap({
			colormap: colorScheme,
			nshades: Math.max(nrNodes + 1, minimumSize),
			format: 'hex',
			alpha: 1,
		}),
		nrNodes + 1,
	);

	if (inverted) {
		nodeColors.reverse();
	}

	const nodeDefaultColor = invertHex(nodeColors[Math.floor(nodeColors.length / 2)]);

	return {
		nodeColors,
		nodeDefaultColor,
	};
}

export const colorPallets: string[] = Object.keys(colorMapPallets);
