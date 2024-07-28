import unzip from 'lodash/unzip';
import {type ServerDataType} from './types';

type TransformedData = {
	transformedData: number[][];
	hashes: string[];
};

// Warning: NOTHING GUARANTEES THIS IS THE SAME AS THE HEADER
enum Indexes {
	nodeOverlaps,
	nodeOrthogonality,
	area,
	aspectRatio,
	lineIntersections,
	fullLineOverlaps,
	lineBends,
	lengthDifference,
	radialDistance,
	unrelatedOverlaps,
}

// Global constants to store how data should be scaled
const indexesToScaleLinear = [
	Indexes.nodeOverlaps,
	Indexes.area,
	Indexes.lineIntersections,
	Indexes.fullLineOverlaps,
	Indexes.lengthDifference,
	Indexes.unrelatedOverlaps,
];
const indexesToScaleInverse = [Indexes.nodeOrthogonality, Indexes.radialDistance];
const indexesCloseToOne = [Indexes.aspectRatio];
const indexesToIgnore = [Indexes.lineBends];

export function transformData(data: ServerDataType): TransformedData {
	// Validate:
	// Check if constants aren't malformed
	if (
		indexesToScaleLinear.length +
			indexesToScaleInverse.length +
			indexesCloseToOne.length +
			indexesToIgnore.length !==
		data.header.length
	) {
		console.error('Invalid constants');
	}

	// Convert data to always make minimization the preference
	const dataGroups = unzip(data.evaluationResults) as unknown as number[][];
	const hashes = dataGroups.pop() as unknown as string[];

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

	return {transformedData: dataGroups, hashes};
}

export function filterIndexes(
	amount: number | null,
	dataGroups: number[][],
	hashes: string[],
): TransformedData {
	if (amount === null || amount === undefined) {
		return {
			transformedData: dataGroups,
			hashes,
		};
	}

	// Get the indexes of the best scoring (smallest) points
	// Assumes data is transformed, since otherwise the smallest points aren't necessarily the best
	const topPointsIndexes = dataGroups.map(vector => {
		const pointsAndIndex = vector.map((n, i) => ({value: n, index: i}));
		const pointsAndIndexSorted = pointsAndIndex.sort((a, b) => a.value - b.value);
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

	return {
		transformedData: dataGroups.map(vector =>
			vector.filter((_, index) => intersectionIndexes.has(index)),
		),
		hashes: hashes.filter((_, index) => intersectionIndexes.has(index)),
	};
}
