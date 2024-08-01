<script lang="ts">
	import Heading from '$ui/heading.svelte';
	import {onMount} from 'svelte';
	import {DotType} from './types.js';
	import {filterIndexes, transformData} from './transform-data.js';
	import {hslFn, scatterPlot} from './draw.js';
	import test from 'node:test';

	export let data;
	let indexX: number = 0;
	let indexY: number = 1;
	let indexFilterCutOff: number | null = 4000;
	let dotType: DotType = DotType.Flag;

	const radioButtons: [string, [string, DotType][]][] = [
		[
			'All layout algorithms',
			[
				['Flag', DotType.Flag],
				['Nested Circles', DotType.NestedCircles],
			],
		],
		[
			'Layout algorithm for only 1 layer',
			[
				['Root', DotType.OnlyRoot],
				['Intermediate', DotType.OnlyIntermediate],
				['Leaf', DotType.OnlyLeaf],
			],
		],
		[
			'Node margin for layer',
			[
				['Root', DotType.NodeMarginRoot],
				['Intermediate', DotType.NodeMarginIntermediate],
				['Leaf', DotType.NodeMarginLeaf],
			],
		],
		[
			'Other variables:',
			[
				['Edge-ports', DotType.EdgePorts],
				['Node size', DotType.NodeSize],
				['Node padding', DotType.NodePadding],
			],
		],
	];

	function rerender() {
		const transformed1 = transformData(data);
		const transformed2 = filterIndexes(
			indexFilterCutOff,
			transformed1.transformedData,
			transformed1.hashes,
		);

		scatterPlot(
			transformed2.transformedData,
			transformed2.hashes,
			indexX,
			indexY,
			dotType,
			data.jsonData,
		);
	}

	onMount(() => {
		rerender();
	});
</script>

<div class="p-6 h-full w-full overflow-hidden">
	<Heading>Explore layout evaluations</Heading>
	<div class="flex flex-row items-start">
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
				on:change={rerender}
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
				on:change={rerender}
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
		<div class="flex flex-col items-start mr-5 ml-5">
			<div class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
				Use color for visualizing ...
			</div>
			<div class="flex flex-row">
				{#each radioButtons as [groupLabel, buttons]}
					<div class="flex flex-col">
						<div class="block mb-2 mr-5 text-sm font-medium text-gray-900 dark:text-white">
							{groupLabel}
						</div>
						{#each buttons as [label, dot]}
							<div class="ml-5">
								<input
									type="radio"
									id="{dot}-radio-button"
									value={dot}
									name="dotType"
									on:change={event => {
										dotType = Number(event.currentTarget.value);
										rerender();
									}}
									checked={dot === dotType}
								/>
								<label for="{dot}-radio-button">{label}</label>
							</div>
						{/each}
					</div>
				{/each}
			</div>
		</div>
		<div class="w-500 ml-5">
			<div class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Legend:</div>
			{#if [DotType.Flag, DotType.NestedCircles, DotType.OnlyRoot, DotType.OnlyIntermediate, DotType.OnlyLeaf].includes(dotType)}
				<div style="color: #4682B4">LayerTree</div>
				<div style="color: #FF6347">Circular</div>
				<div style="color: #9ACD32">ForceBased</div>
			{/if}
			{#if [DotType.EdgePorts].includes(dotType)}
				<div style="color: #B8860B">True</div>
				<div style="color: #8A2BE2">False</div>
			{/if}
			{#if [DotType.NodeSize, DotType.NodePadding, DotType.NodeMarginRoot, DotType.NodeMarginIntermediate, DotType.NodeMarginLeaf].includes(dotType)}
				<div class="flex flex-row">
					{#each [[0, 5, 10, 15, 20], [25, 30, 35, 40, 45], [50, 55, 60, 65, 70], [75, 80, 85, 90, 95], [100]] as ns}
						<div class="flex flex-col mr-5">
							{#each ns as n}
								<div style="color: {hslFn(n)}">{n} px</div>
							{/each}
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>
	<div class="flex flex-row h-full">
		<svg id="canvas" class="h-full w-2/5">
			<g class="vis" transform="translate(50,50)">
				<g class="axis x" />
				<g class="axis y" />
				<g id="points" />
			</g>
		</svg>
		<div class="w-2/5 h-full" id="svg-container" />
		<div class="w-1/5 overflow-y-auto h-4/5" id="tooltip-div" />
	</div>
</div>
