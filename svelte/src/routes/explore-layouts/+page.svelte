<script lang="ts">
	import Heading from '$ui/heading.svelte';
	import * as d3 from 'd3';
	import zip from 'lodash/zip.js';
	import unzip from 'lodash/unzip.js';
	import range from 'lodash/range.js';
	import {onMount} from 'svelte';
	import {type LayoutNestingLevels, type LayoutOptions} from '$types';

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
			const q = d3.quantile(data, 0)!;
			const r = d3.quantile(data, 0.9)!;
			scales[index] = d3.scaleLinear([q, r], [0, 1]);
		});

		indexesToScaleInverse.map(index => {
			const data = useIndexFilter(dataGroups[index]);
			const q = d3.quantile(data, 0)!;
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
			const q = d3.quantile(data, 0)!;
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
		console.log(dataGroups[Indexes.aspectRatio]);
		points = useIndexFilter(
			zip(dataGroups[indexX], dataGroups[indexY], hashes) as [number, number, string][],
		);

		const scaleX = scales[indexX].range([0, width]);
		const scaleY = scales[indexY].range([height, 0]);

		const axisX = d3.axisBottom(scaleX);
		const axisY = d3.axisLeft(scaleY);

		// Generate axes
		//@ts-ignore
		d3.select('g.axis.x').call(axisX).attr('transform', `translate(0, ${height})`);
		//@ts-ignore
		d3.select('g.axis.y').call(axisY);

		// Set up stuff for actual rendering
		const colorMap: {[layout in LayoutOptions]: string} = {
			layerTree: '#4682B4',
			circular: '#FF6347',
			forceBased: '#9ACD32',
			straightTree: '#EE82EE',
		};
		const levelMapCircle: {[layer in LayoutNestingLevels]: number} = {
			inner: 3,
			intermediate: 6,
			root: 9,
		};
		const widthFlag = 4;
		const heightFlag = widthFlag * widthFlag;

		// Helper function
		function drawCircle(
			selection: d3.Selection<SVGGElement, [number, number, string], d3.BaseType, unknown>,
			level: LayoutNestingLevels,
		) {
			selection
				.append('circle')
				.attr('fill', d => {
					const h = d[2];
					const layout = data.jsonData[h][`${level}Layout`];
					return colorMap[layout];
				})
				.attr('fill-opacity', 1)
				.attr('r', levelMapCircle[level])
				.attr('cx', d => scaleX(d[0]))
				.attr('cy', d => scaleY(d[1]))
				.on('click', function (_, d) {
					const hash = d[2];
					const jsonData = data.jsonData[hash];
					const text = `${hash}`;
					d3.select('#tooltip-div').text(text);
				})
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
					const h = d[2];
					const layout = data.jsonData[h][`${level}Layout`];
					return colorMap[layout];
				})
				.attr('fill-opacity', 1)
				.attr('x', d => offsetX - 0.001)
				.attr('y', d => 0.5 * heightFlag)
				.attr('width', widthFlag)
				.attr('height', heightFlag)
				.on('click', function (_, d) {
					const hash = d[2];
					const jsonData = data.jsonData[hash];
					const text = `${hash}`;
					d3.select('#tooltip-div').text(text);
				});
		}

		// Now, actually render all the dots
		d3.select('#points').selectAll('g').remove();
		const selection = d3
			.select('#points')
			.selectAll('g')
			.data(points)
			.enter()
			.append('g')
			.attr('class', 'point-group');
		if (false) {
			drawCircle(selection, 'root');
			drawCircle(selection, 'intermediate');
			drawCircle(selection, 'inner');
		}
		{
			selection.attr('transform', d => `translate(${scaleX(d[0])} ${scaleY(d[1])})`);
			drawFlag(selection, 'root');
			drawFlag(selection, 'intermediate');
			drawFlag(selection, 'inner');
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

	function rerender() {
		makeIndexFilter();
		// TODO refactor scale logic, should not require retransforming data
		({scales} = transformData());
		scatterPlot();
	}

	onMount(() => {
		({scales, dataGroups, hashes} = transformData());
		rerender();
	});
</script>

<div class="p-6 h-full w-full overflow-hidden">
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
		<div class="w-500 ml-5">
			<div class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Legend:</div>
			<div style="color: #4682B4">layerTree</div>
			<div style="color: #FF6347">circular</div>
			<div style="color: #9ACD32">forceBased</div>
		</div>
	</div>
	<div class="flex flex-row h-full">
		<svg id="canvas" class="h-full w-4/5">
			<g class="vis" transform="translate(50,50)">
				<g class="axis x" />
				<g class="axis y" />
				<g id="points" />
			</g>
		</svg>
		<div class="w-1/5 overflow-auto" id="tooltip-div" />
	</div>
</div>
