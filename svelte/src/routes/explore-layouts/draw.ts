/* eslint-disable @typescript-eslint/no-explicit-any */
import {type LayoutOptions, type LayoutNestingLevels, type DrawSettingsInterface} from '$types';
import * as d3 from 'd3';
import zip from 'lodash/zip';
import {DotType, type JsonDataType} from './types';

/** Global constants representing canvas width and height (can safely be changed here) */
const width = 500,
	height = 500;

/**
 * Variable storing which color represents which layout
 */
const colorMap: {[layout in LayoutOptions]: {hex: string; h: number; s: number; l: number}} = {
	layerTree: {hex: '#4682B4', h: 207, s: 44, l: 49},
	circular: {hex: '#FF6347', h: 9, s: 100, l: 64},
	forceBased: {hex: '#9ACD32', h: 80, s: 61, l: 50},
	straightTree: {hex: '#EE82EE', h: 300, s: 76, l: 72},
};

const scale90 = d3.scaleLinear([0, 100], [30, 90]);
export function hslFn(val: number) {
	return `hsl(207, ${scale90(val)}%, ${scale90(val)}%)`;
}

/**
 * Function to color the points on the scatterplot
 */
function useColorMap(
	data: DrawSettingsInterface,
	nestingLevel: LayoutNestingLevels,
	dotType?: DotType,
) {
	const layout = data[`${nestingLevel}Layout`];

	if (dotType === DotType.EdgePorts) {
		return data.showEdgePorts ? '#B8860B' : '#8A2BE2';
	}
	if (dotType === DotType.NodeSize) {
		return hslFn(data.minimumNodeSize);
	}
	if (dotType === DotType.NodePadding) {
		return hslFn(data.nodePadding);
	}
	if (dotType === DotType.NodeMarginRoot) {
		return hslFn(data.nodeMargin.root);
	}
	if (dotType === DotType.NodeMarginIntermediate) {
		return hslFn(data.nodeMargin.intermediate);
	}
	if (dotType === DotType.NodeMarginLeaf) {
		return hslFn(data.nodeMargin.inner);
	}

	// if (data[`${nestingLevel}Layout`] !== 'circular') {
	// 	return '#FFFAFA';
	// } else {
	// 	return `hsl(207, ${data.nodeMargin[nestingLevel]}%, 49%)`;
	// }

	switch (layout) {
		case 'layerTree':
			//return data.layoutSettings[nestingLevel].uniformSize ? '#6A5ACD' : '#4682B4';
			return colorMap.layerTree.hex;
		case 'circular':
			return colorMap.circular.hex;
		case 'forceBased':
			return colorMap.forceBased.hex;
		case 'straightTree':
			return colorMap.straightTree.hex;
	}
}

/**
 * Builds a function to populate the sidebars
 * Resulting function is to be used as an event callback with the proper d3-data associated.
 */
function sidebarGenerator(jsonData: JsonDataType) {
	return function (_: unknown, data: [number, number, string]) {
		const hash = data[2];
		const jsonDataThis = jsonData[hash];

		let text = `<p><strong>Datapoint:</strong> ${hash}</p>
			<br /><hr /> <br />
			<p><strong>Edge ports: </strong>${jsonDataThis.showEdgePorts}</p>
			<p><strong>Node size: </strong>${jsonDataThis.minimumNodeSize}</p>
			<p><strong>Node padding: </strong>${jsonDataThis.nodePadding}</p>`;

		(['inner', 'intermediate', 'root'] as LayoutNestingLevels[]).forEach(l => {
			const layoutType = jsonDataThis[`${l}Layout`];
			text += `<br /><hr /> <br />
				<div style="border: 2px solid ${colorMap[layoutType].hex}; padding: 10px; border-radius: 15px">
				<p><strong>${l}Layout</strong></p>
				<p><strong>Layout type: </strong>${layoutType}</p>
				<p><strong>Node margin: </strong>${jsonDataThis.nodeMargin[l]}</p>`;

			if (layoutType === 'layerTree') {
				text += `
					<hr />
					<p><strong>Uniform node sizes: </strong>${jsonDataThis.layoutSettings[l].uniformSize}</p>`;
			}

			if (layoutType === 'forceBased') {
				text += `
					<hr />
					<p><strong>Collide rectangles: </strong>${jsonDataThis.layoutSettings[l].collideRectangles}</p>
					<p><strong>Center force: </strong>${JSON.stringify(
						jsonDataThis.layoutSettings[l].centerForceStrength,
					)}</p>
					<p><strong>Link force: </strong>${JSON.stringify(jsonDataThis.layoutSettings[l].linkForce)}</p>
					<p><strong>Many body force: </strong>${JSON.stringify(
						jsonDataThis.layoutSettings[l].manyBodyForce,
					)}</p>
					`;
			}

			text += '</div>';
		});

		d3.select('#tooltip-div').html(text);

		// All image as svg
		fetch(`/svg/${hash}.svg`).then(response => {
			response.text().then(s => {
				document.getElementById('svg-container')!.innerHTML = s;
				const svg = document.getElementById('svg-container')!.children[0];

				// Add zoom
				svg.innerHTML = `<g id="zoom-canvas">${svg.innerHTML}</g>`;
				d3.select('#zoom-canvas').call(
					d3.zoom<any, any>().on('zoom', ({transform}) => {
						d3.select('#zoom-canvas').attr('transform', transform);
					}),
				);
			});
		});
	};
}

export function scatterPlot(
	data: number[][],
	hashes: string[],
	indexX: number,
	indexY: number,
	dotType: DotType,
	jsonData: JsonDataType,
) {
	const points = zip(data[indexX], data[indexY], hashes) as [number, number, string][];

	// Create scales
	const scaleX = d3.scaleLinear(
		[Math.min(...data[indexX]), d3.quantile(data[indexX], 0.9)!],
		[0, width],
	);
	const scaleY = d3.scaleLinear(
		[Math.min(...data[indexY]), d3.quantile(data[indexY], 0.9)!],
		[height, 0],
	);

	// Generate axes
	const axisX = d3.axisBottom(scaleX);
	const axisY = d3.axisLeft(scaleY);
	//@ts-ignore
	d3.select('g.axis.x').call(axisX).attr('transform', `translate(0, ${height})`);
	//@ts-ignore
	d3.select('g.axis.y').call(axisY);

	// Variables storing the dimensions of the datapoints
	let levelMapCircle: {[layer in LayoutNestingLevels]: number};
	const widthFlag = 4;
	const heightFlag = widthFlag * widthFlag;

	// Helper function to generate the datapoints (depending on the dotType)
	function drawCircle(
		selection: d3.Selection<SVGGElement, [number, number, string], d3.BaseType, unknown>,
		level: LayoutNestingLevels,
		dotType?: DotType,
	) {
		selection
			.append('circle')
			.attr('fill', d => {
				const hash = d[2];
				return useColorMap(jsonData[hash], level, dotType);
			})
			.attr('fill-opacity', 1)
			.attr('r', levelMapCircle[level])
			.attr('cx', d => scaleX(d[0]))
			.attr('cy', d => scaleY(d[1]))
			.on('click', sidebarGenerator(jsonData))
			.attr('class', `${level}-dot`);
	}

	function drawFlag(
		selection: d3.Selection<SVGGElement, [number, number, string], d3.BaseType, unknown>,
		level: LayoutNestingLevels,
	) {
		const offsetX =
			level === 'root'
				? -1.5 * widthFlag
				: level === 'intermediate'
				? -0.5 * widthFlag
				: 0.5 * widthFlag;

		selection
			.append('rect')
			.attr('fill', d => {
				const hash = d[2];
				return useColorMap(jsonData[hash], level);
			})
			.attr('fill-opacity', 1)
			.attr('x', d => offsetX - 0.001)
			.attr('y', d => -0.5 * heightFlag)
			.attr('width', widthFlag)
			.attr('height', heightFlag)
			.on('click', sidebarGenerator(jsonData));
	}

	// Render all the dots / flags
	d3.select('#points').selectAll('g').remove();
	const selection = d3.select('#points').selectAll('g').data(points).enter().append('g');
	if (dotType === DotType.NestedCircles) {
		levelMapCircle = {
			inner: 3,
			intermediate: 6,
			root: 9,
		};
		drawCircle(selection, 'root');
		drawCircle(selection, 'intermediate');
		drawCircle(selection, 'inner');
	} else if (dotType === DotType.OnlyRoot) {
		levelMapCircle = {root: 9, inner: 9, intermediate: 9};
		drawCircle(selection, 'root');
	} else if (dotType === DotType.OnlyIntermediate) {
		levelMapCircle = {root: 9, inner: 9, intermediate: 9};
		drawCircle(selection, 'intermediate');
	} else if (dotType === DotType.OnlyLeaf) {
		levelMapCircle = {root: 9, inner: 9, intermediate: 9};
		drawCircle(selection, 'inner');
	} else if (dotType === DotType.Flag) {
		levelMapCircle = {inner: 0, intermediate: 0, root: 0};
		selection
			.attr('transform', d => `translate(${scaleX(d[0])} ${scaleY(d[1])})`)
			.attr('class', 'point-group');
		drawFlag(selection, 'root');
		drawFlag(selection, 'intermediate');
		drawFlag(selection, 'inner');
	} else {
		levelMapCircle = {root: 9, inner: 9, intermediate: 9};
		drawCircle(selection, 'inner', dotType);
	}

	// Finally, allow zooming
	const container = d3.select('.vis');
	d3.select('#canvas').call(
		d3.zoom<any, any>().on('zoom', ({transform}) => {
			container.attr('transform', transform);
			(['root', 'intermediate', 'inner'] as LayoutNestingLevels[]).forEach(level => {
				d3.select('#points')
					.selectAll(`.${level}-dot`)
					.attr('r', levelMapCircle[level] / transform.k);
			});
			d3.select('#points')
				.selectAll(`.point-group`)
				.attr(
					'transform',
					(d: any) => `translate(${scaleX(d[0])} ${scaleY(d[1])})
					scale(${1 / transform.k} ${1 / transform.k})`,
				);
		}),
	);
}
