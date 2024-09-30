import unzip from 'lodash/unzip';
import {
	type JsonDataType,
	type Identifier,
	type ServerDataType,
	type countLayoutType,
} from './types';
import zip from 'lodash/zip';
import * as d3 from 'd3';
import {type LayoutNestingLevels, type LayoutOptions} from '$types';

const layoutAlgorithms: LayoutOptions[] = ['layerTree', 'circular', 'forceBased'];
const nestingLevels: LayoutNestingLevels[] = ['inner', 'intermediate', 'root'];

type TransformedData = {
	transformedData: number[][];
	identifiers: Identifier[];
};

// Warning: NOTHING GUARANTEES THIS IS THE SAME AS THE HEADER
enum newIndexes {
	nodeOverlaps,
	nodeOrthogonality,
	nodeDensity,
	area,
	aspectRatio,
	lineIntersections,
	lengthDifference,
	radialDistance,
	unrelatedOverlaps,
}

enum oldIndexes {
	nodeOverlaps,
	nodeOrthogonality,
	area,
	aspectRatio,
	lineIntersections,
	fullOverlaps,
	lineBends,
	lengthDifference,
	radialDistance,
	unrelatedOverlaps,
}

function getScalingConstants(oldData?: boolean) {
	if (oldData === true) {
		console.log({oldData});
		return {
			indexesToScaleLinear: [
				oldIndexes.nodeOverlaps,
				oldIndexes.area,
				oldIndexes.lineIntersections,
				oldIndexes.lengthDifference,
				oldIndexes.unrelatedOverlaps,
				oldIndexes.fullOverlaps,
			],
			indexesToScaleInverse: [oldIndexes.nodeOrthogonality, oldIndexes.radialDistance],
			indexesCloseToOne: [oldIndexes.aspectRatio],
			indexesToIgnore: [oldIndexes.lineBends],
		};
	} else {
		return {
			indexesToScaleLinear: [
				newIndexes.nodeOverlaps,
				newIndexes.nodeDensity,
				newIndexes.area,
				newIndexes.lineIntersections,
				newIndexes.lengthDifference,
				newIndexes.unrelatedOverlaps,
			],
			indexesToScaleInverse: [newIndexes.nodeOrthogonality, newIndexes.radialDistance],
			indexesCloseToOne: [newIndexes.aspectRatio],
			indexesToIgnore: [],
		};
	}
}
let indexesToScaleLinear: number[] = [];
let indexesToScaleInverse: number[] = [];
let indexesCloseToOne: number[] = [];
let indexesToIgnore: number[] = [];

export function transformData(data: ServerDataType): TransformedData & {fileNames: Set<string>} {
	// Validate:
	// Check if constants aren't malformed
	// if (
	// 	indexesToScaleLinear.length +
	// 		indexesToScaleInverse.length +
	// 		indexesCloseToOne.length +
	// 		indexesToIgnore.length !==
	// 	data.header.length - 2
	// ) {
	// 	console.error('Invalid constants');
	// }
	const tmp = getScalingConstants(data.oldData);
	indexesToScaleLinear = tmp.indexesToScaleLinear;
	indexesToScaleInverse = tmp.indexesToScaleInverse;
	indexesCloseToOne = tmp.indexesCloseToOne;
	indexesToIgnore = tmp.indexesToIgnore;

	// Convert data to always make minimization the preference
	const dataGroups = unzip(data.evaluationResults) as unknown as number[][];
	console.log(data.header);
	let identifiers: Identifier[];
	if (data.oldData === true) {
		identifiers = dataGroups.pop()!.map(h => ({
			fileName: 'jhotdraw-trc-sum-rs.json',
			hash: h as unknown as string,
		}));
	} else {
		identifiers = zip(dataGroups.pop(), dataGroups.pop()).map(([f, h]) => ({
			fileName: f as unknown as string,
			hash: h as unknown as string,
		}));
	}

	indexesToScaleLinear.forEach(index => {
		const data = dataGroups[index];
		dataGroups[index] = data.map(d => d);
	});

	indexesToScaleInverse.forEach(index => {
		const data = dataGroups[index];
		dataGroups[index] = data.map(d => -d);
	});

	indexesCloseToOne.forEach(index => {
		dataGroups[index] = dataGroups[index].map(d => (d < 1 ? 1 / d : d));
	});

	indexesToIgnore.forEach(index => {
		const data = dataGroups[index];
		dataGroups[index] = data.map(d => d);
	});

	const fileNames = new Set(identifiers.map(({fileName}) => fileName));

	return {transformedData: dataGroups, identifiers, fileNames};
}

export function normalizeData(
	dataGroups: number[][],
	identifiers: Identifier[],
	fileNames: Set<string>,
) {
	// In the transformation step, data is transformed such that lower numbers are always better
	// Now, we're trying normalize datapoints with respect to their dataset.
	const scales: {[f: string]: {[i: number]: d3.ScaleLinear<number, number, never>}} = {};
	[...fileNames].forEach(f => {
		scales[f] = {};
		dataGroups.forEach((_, i) => {
			const data = dataGroups[i].filter((_, i) => identifiers[i].fileName === f);
			scales[f][i] = d3.scaleLinear([d3.quantile(data, 0.25)!, d3.quantile(data, 0.75)!], [0, 1]);
		});
	});

	// Now, apply that to every datapoint
	return dataGroups.map((vector, index) => {
		return vector.map(n => {
			const fileName = identifiers[index].fileName;
			return scales[fileName][index](n);
		});
	});
}

export function filterIndexes(
	amount: number | null,
	topNFiles: Set<string>,
	filterFiles: Set<string>,
	dataGroups: number[][],
	identifiers: Identifier[],
): TransformedData & {countFile: {[fileName: string]: number}} {
	if (amount === null || amount === undefined) {
		return {
			transformedData: dataGroups,
			identifiers,
			countFile: {},
		};
	}

	// Get the indexes of the best scoring (smallest) points
	// Assumes data is transformed, since otherwise the smallest points aren't necessarily the best
	const topPointsIndexes = dataGroups.map(vector => {
		// We need both the value and its index for this calculation, so first transform the data
		const pointsAndIndex = vector.map((n, i) => ({value: n, index: i}));
		// Now we can sort without losing the original index
		const pointsAndIndexSorted = pointsAndIndex
			.sort((a, b) => a.value - b.value)
			// Now, filter out based on the given file
			.filter(({index}) => topNFiles.has(identifiers[index].fileName));
		// Lastly, we take the top n.
		return pointsAndIndexSorted.slice(0, amount).map(({index}) => index);
	});

	// Now take the intersection
	let intersectionIndexes = new Set<number>(topPointsIndexes[0]);
	topPointsIndexes.forEach((vector, index) => {
		// Remember, some metrics we want to skip!
		if (indexesToIgnore.includes(index)) {
			return;
		}

		intersectionIndexes = intersectionIndexes.intersection(new Set<number>(vector));
	});

	// Not done yet, because we do want to pass on all datapoints related to a settings hash
	const hashes = new Set([...intersectionIndexes].map(i => identifiers[i].hash));
	const indexesToKeep = new Set(
		identifiers.flatMap(({fileName, hash}, index) =>
			hashes.has(hash) && filterFiles.has(fileName) ? [index] : [],
		),
	);

	//console.log([...intersectionIndexes].map(i => identifiers[i].fileName));
	// Finally, calculate some stats
	const countFile: {[fileName: string]: number} = {};
	filterFiles.forEach(f => {
		countFile[f] = [...intersectionIndexes].filter(i => identifiers[i].fileName === f).length;
	});

	return {
		transformedData: dataGroups.map(vector =>
			vector.filter((_, index) => indexesToKeep.has(index)),
		),
		identifiers: identifiers.filter((_, index) => indexesToKeep.has(index)),
		countFile,
	};
}

// Filter by layout algorithm used
export function filterLayouts(
	layoutFilter: Map<LayoutNestingLevels, Map<LayoutOptions, boolean>>,
	dataGroups: number[][],
	identifiers: Identifier[],
	jsonData: JsonDataType,
): TransformedData & {countLayout: countLayoutType} {
	const filteredIndexes = new Set(
		identifiers.flatMap(({hash}, index) => {
			const drawSettings = jsonData[hash];
			return (['inner', 'intermediate', 'root'] as LayoutNestingLevels[]).every(level => {
				const layout = drawSettings[`${level}Layout`];
				return layoutFilter.get(level)!.get(layout);
			})
				? [index]
				: [];
		}),
	);

	// Get some debug info
	const countLayout: countLayoutType = {} as never;
	nestingLevels.forEach(level => {
		countLayout[level] = {} as never;
		layoutAlgorithms.forEach(algo => {
			countLayout[level]![algo] = [...filteredIndexes].filter(
				i => jsonData[identifiers[i].hash][`${level}Layout`] === algo,
			).length;
		});
	});
	countLayout.edgePort = {true: 0, false: 0};
	identifiers
		.filter((_, index) => filteredIndexes.has(index))
		.forEach(identifier => {
			const data = jsonData[identifier.hash];
			data.showEdgePorts ? countLayout.edgePort.true++ : countLayout.edgePort.false++;
		});

	return {
		transformedData: dataGroups.map(vector => vector.filter((_, i) => filteredIndexes.has(i))),
		identifiers: identifiers.filter((_, i) => filteredIndexes.has(i)),
		countLayout,
	};
}
