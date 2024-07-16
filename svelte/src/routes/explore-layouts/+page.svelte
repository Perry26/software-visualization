<script lang="ts">
	import Heading from '$ui/heading.svelte';
	import * as d3 from 'd3';
	import zip from 'lodash/zip.js';
	import unzip from 'lodash/unzip.js';
	import range from 'lodash/range.js';
	import {onMount} from 'svelte';

	export let data;

	let indexX = 0;
	let indexY = 1;

	let scales: d3.ScaleLinear<number, number, never>[], dataGroups: number[][], hashes: string[];

	let indexFilter: number[] | undefined = undefined;

	const width = 500;
	const height = 500;

	const pointRadius = 5;

	let indexFilterCutOff: number | null = null;

	function makeIndexFilter() {
		if (indexFilterCutOff === null) {
			indexFilter = undefined;
			return;
		}

		const amount = indexFilterCutOff;

		// Get the top indexes in an array
		const topPoints = dataGroups.map((group, index) => {
			const scale = scales[index];

			const scaledPoints = group.map((d, i) => ({value: scale(d), index: i}));
			scaledPoints.sort((a, b) => a.value - b.value);

			return scaledPoints.slice(0, amount).map(({index}) => index);
		});

		// Get intersection of the arrays
		let intersection = new Set(topPoints[0]);
		topPoints.forEach((group, index) => {
			//Ignoring the irrelevant indexes is important
			if (indexesToIgnore.includes(index)) {
				return;
			}

			intersection = intersection.intersection(new Set(group));
		});

		console.log(intersection.size);

		indexFilter = [...intersection];
	}

	function useIndexFilter<T>(points: T[]) {
		if (indexFilter !== undefined) {
			return points.filter((_, i) => indexFilter!.includes(i));
		} else {
			return points;
		}
	}

	function validateEvaluationResults(
		evaluationResults: any[][],
	): evaluationResults is [
		number,
		number,
		number,
		number,
		number,
		number,
		number,
		number,
		number,
		number,
		string,
	][] {
		return evaluationResults.every(data => {
			if (typeof data[10] !== 'string') {
				return false;
			}
			if (
				!range(10).every(i => {
					if (typeof data[i] !== 'number') {
						return false;
					}
					return true;
				})
			) {
				return false;
			}
			return true;
		});
	}

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

	function transformData() {
		if (!validateEvaluationResults(data.evaluationResults)) {
			console.error('Invalid data from sever');
		}

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

		// Parse some of the data
		const dataGroups = unzip(data.evaluationResults) as unknown as number[][];
		const hashes = dataGroups.pop() as unknown as string[];

		// Generate scales for the right domain, based on what property we're dealing with.
		// (range will be set in the scatterPlot-function)
		const scales: d3.ScaleLinear<number, number, never>[] = [];
		indexesToScaleLinear.map(index => {
			const data = useIndexFilter(dataGroups[index]);
			const q = d3.quantile(data, 0.1)!;
			const r = d3.quantile(data, 0.9)!;
			scales[index] = d3.scaleLinear([q, r], [0, 1]);
		});

		indexesToScaleInverse.map(index => {
			const data = useIndexFilter(dataGroups[index]);
			const q = d3.quantile(data, 0.1)!;
			const r = d3.quantile(data, 0.9)!;
			scales[index] = d3.scaleLinear([q, r], [1, 0]);
		});

		// Here, we have to modify the original data!
		// Any datapoint lower than 1 will be changed to its reciprical!
		indexesCloseToOne.map(index => {
			const data = useIndexFilter(dataGroups[index]);
			data.forEach((d, i) => {
				data[i] = d < 1 ? 1 / d : d;
			});

			// Otherwise, we do the same as the rest:
			const q = d3.quantile(data, 0.1)!;
			const r = d3.quantile(data, 0.9)!;
			scales[index] = d3.scaleLinear([q, r], [0, 1]);
		});

		indexesToIgnore.map(index => {
			const data = useIndexFilter(dataGroups[index]);
			scales[index] = d3.scaleLinear([d3.min(data)!, d3.max(data)!], [0, 1]);
		});

		return {scales, dataGroups, hashes};
	}

	function scatterPlot() {
		let points: [number, number, string][];
		points = useIndexFilter(
			zip(dataGroups[indexX], dataGroups[indexY], hashes) as [number, number, string][],
		);

		const scaleX = scales[indexX].range([0, width]);
		const scaleY = scales[indexY].range([height, 0]);

		const axisX = d3.axisBottom(scaleX);
		const axisY = d3.axisLeft(scaleY);

		// Color dots
		const colorValues = new Set<string>();
		hashes.forEach(h =>
			colorValues.add(
				String([
					data.jsonData[h].rootLayout,
					data.jsonData[h].intermediateLayout,
					data.jsonData[h].innerLayout,
				]),
			),
		);
		const colorScheme = d3.scaleOrdinal(d3.schemeAccent).domain([...colorValues]);

		// Generate axes
		//@ts-ignore
		d3.select('g.axis.x').call(axisX).attr('transform', `translate(0, ${height})`);
		//@ts-ignore
		d3.select('g.axis.y').call(axisY);

		d3.select('#points')
			.selectAll('circle')
			.data(points)
			.join('circle')
			.attr('fill', d => {
				const h = d[2];
				return colorScheme(
					String([
						data.jsonData[h].rootLayout,
						data.jsonData[h].intermediateLayout,
						data.jsonData[h].innerLayout,
					]),
				);
			})
			.attr('fill-opacity', 0.73)
			.attr('r', pointRadius)
			.attr('cx', d => scaleX(d[0]))
			.attr('cy', d => scaleY(d[1]))
			.on('click', function (_, d) {
				const hash = d[2];
				const jsonData = data.jsonData[hash];
				const text = `${hash}\n${jsonData.innerLayout} ${jsonData.intermediateLayout} ${jsonData.rootLayout}`;
				d3.select('#tooltip-div').text(text);
			});

		const container = d3.select('.vis');
		d3.select('#canvas').call(
			d3.zoom<any, any>().on('zoom', ({transform}) => {
				container.attr('transform', transform);
				d3.select('#points')
					.selectAll('circle')
					.attr('r', pointRadius / transform.k);
			}),
		);
	}

	function rerender() {
		makeIndexFilter();
		// TODO refactor scale logic, should not require retransforming data
		({scales, dataGroups, hashes} = transformData());
		scatterPlot();
	}

	onMount(() => {
		({scales, dataGroups, hashes} = transformData());
		rerender();
	});
</script>

<div class="p-6 h-screen w-screen">
	<Heading>Explore layout evaluations</Heading>
	<div class="flex flex-row items-center">
		<div class="flex flex-col items-center">
			<label
				for="x-select-val"
				class="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
			>
				x-axis
			</label>
			<select
				id="x-select val"
				class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
				bind:value={indexX}
				on:change={scatterPlot}
			>
				{#each data.header as header, i}
					<option value={i}>{header}</option>
				{/each}
			</select>
		</div>
		<div class="flex flex-col items-center">
			<label
				for="y-select-val"
				class="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
			>
				y-axis
			</label>
			<select
				id="y-select val"
				class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
				bind:value={indexY}
				on:change={scatterPlot}
			>
				{#each data.header as header, i}
					<option value={i}>{header}</option>
				{/each}
			</select>
		</div>
		<div class="flex flex-col items-center">
			<label
				for="remove-extremes"
				class="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
			>
				Show only top n values
			</label>
			<input
				id="remove-extremes"
				type="number"
				class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
				bind:value={indexFilterCutOff}
				on:change={rerender}
			/>
		</div>
		<div class="w-500 ml-5" id="tooltip-div" />
	</div>
	<svg id="canvas" class="w-full h-full">
		<g class="vis" transform="translate(50,50)">
			<g class="axis x" />
			<g class="axis y" />
			<g id="points" />
		</g>
	</svg>
</div>
