<script lang="ts">
	import Heading from '$ui/heading.svelte';
	import {onMount} from 'svelte';
	import {DotType} from './types.js';
	import {filterIndexes, transformData} from './transform-data.js';
	import {scatterPlot} from './draw.js';

	export let data;
	let indexX: number = 0;
	let indexY: number = 1;
	let indexFilterCutOff: number | null = 4000;
	let dotType: DotType = DotType.Flag;

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
		<div class="w-500 ml-5">
			<div class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Legend:</div>
			<div style="color: #4682B4">LayerTree</div>
			<div style="color: #FF6347">Circular</div>
			<div style="color: #9ACD32">ForceBased</div>
			<div style="color: #B8860B">True</div>
			<div style="color: #8A2BE2">False</div>
		</div>
		<div class="flex flex-col">
			<div class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
				Visualize layout-algorithm:
			</div>
			{#each [0, 1, 2, 3, 4] as d}
				{#if typeof d === 'number'}
					<div class="ml-5">
						<input
							type="radio"
							id="{d}-radio-button"
							value={d}
							name="dotType"
							on:change={event => {
								dotType = Number(event.currentTarget.value);
								rerender();
							}}
							checked={d === dotType}
						/>
						<label for="{d}-radio-button">{DotType[d]}</label>
					</div>
				{/if}
			{/each}
		</div>
		<div class="flex flex-col">
			{#each [5, 6, 7, 8, 9, 10] as d}
				{#if typeof d === 'number'}
					<div class="ml-5">
						<input
							type="radio"
							id="{d}-radio-button"
							value={d}
							name="dotType"
							on:change={event => {
								dotType = Number(event.currentTarget.value);
								rerender();
							}}
							checked={d === dotType}
						/>
						<label for="{d}-radio-button">{DotType[d]}</label>
					</div>
				{/if}
			{/each}
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
		<div class="w-1/5 overflow-y-auto h-4/5" id="tooltip-div" />
	</div>
</div>
