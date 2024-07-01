<script lang="ts">
	import Heading from '$ui/heading.svelte';
	import * as d3 from 'd3';
	import zip from 'lodash/zip.js';
	import {onMount} from 'svelte';

	export let data;

	let indexX = 0;
	let indexY = 1;

	const width = 500;
	const height = 500;

	const pointRadius = 5;

	let removeExtremes = {max: 0, min: 0};

	// Better tooltip / filtering
	function scatterPlot() {
		// Transform data and remove extreme values if desired
		let xValues = data.evaluationResults.map(d => d[indexX]) as number[];
		let yValues = data.evaluationResults.map(d => d[indexY]) as number[];
		let hashes = data.evaluationResults.map(d => d[d.length - 1]) as string[];
		let points = zip(xValues, yValues, hashes) as [number, number, string][];
		points.sort((a, b) => b[0] - a[0]).splice(0, removeExtremes.max);
		points.sort((a, b) => b[1] - a[1]).splice(0, removeExtremes.max);
		points.sort((a, b) => a[0] - b[0]).splice(0, removeExtremes.min);
		points.sort((a, b) => a[1] - b[1]).splice(0, removeExtremes.min);
		xValues = points.map(([x, _]) => x);
		yValues = points.map(([_, y]) => y);

		const scaleX = d3.scaleLinear([Math.min(...xValues), Math.max(...xValues)], [0, width]);
		const scaleY = d3.scaleLinear([Math.min(...yValues), Math.max(...yValues)], [height, 0]);

		const axisX = d3.axisBottom(scaleX);
		const axisY = d3.axisLeft(scaleY);

		// Generate axes
		//@ts-ignore
		d3.select('g.axis.x').call(axisX).attr('transform', `translate(0, ${height})`);
		//@ts-ignore
		d3.select('g.axis.y').call(axisY);

		d3.select('#points')
			.selectAll('circle')
			.data(points)
			.join('circle')
			.attr('fill', 'steelblue')
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

	onMount(() => {
		scatterPlot();
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
				Remove extreme values
			</label>
			<input
				id="remove-extremes"
				type="number"
				class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
				bind:value={removeExtremes.min}
				on:change={scatterPlot}
			/>
			<input
				id="remove-extremes"
				type="number"
				class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
				bind:value={removeExtremes.max}
				on:change={scatterPlot}
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
