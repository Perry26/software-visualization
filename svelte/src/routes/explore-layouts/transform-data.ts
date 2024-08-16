import unzip from 'lodash/unzip';
import {type JsonDataType, type Identifier, type ServerDataType} from './types';
import zip from 'lodash/zip';
import * as d3 from 'd3';
import {type LayoutNestingLevels, type LayoutOptions} from '$types';

type TransformedData = {
	transformedData: number[][];
	identifiers: Identifier[];
};

// Warning: NOTHING GUARANTEES THIS IS THE SAME AS THE HEADER
enum Indexes {
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

// Global constants to store how data should be scaled
const indexesToScaleLinear = [
	Indexes.nodeOverlaps,
	Indexes.nodeDensity,
	Indexes.area,
	Indexes.lineIntersections,
	Indexes.lengthDifference,
	Indexes.unrelatedOverlaps,
];
const indexesToScaleInverse = [Indexes.nodeOrthogonality, Indexes.radialDistance];
const indexesCloseToOne = [Indexes.aspectRatio];
const indexesToIgnore: Indexes[] = [];

export function transformData(data: ServerDataType): TransformedData & {fileNames: Set<string>} {
	// Validate:
	// Check if constants aren't malformed
	if (
		indexesToScaleLinear.length +
			indexesToScaleInverse.length +
			indexesCloseToOne.length +
			indexesToIgnore.length !==
		data.header.length - 2
	) {
		console.error('Invalid constants');
	}

	// Convert data to always make minimization the preference
	const dataGroups = unzip(data.evaluationResults) as unknown as number[][];
	const identifiers = zip(dataGroups.pop(), dataGroups.pop()).map(([f, h]) => ({
		fileName: f as unknown as string,
		hash: h as unknown as string,
	}));

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
): TransformedData {
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

	return {
		transformedData: dataGroups.map(vector => vector.filter((_, i) => filteredIndexes.has(i))),
		identifiers: identifiers.filter((_, i) => filteredIndexes.has(i)),
	};
}
