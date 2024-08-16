<script lang="ts">
	import Heading from '$ui/heading.svelte';
	import {onMount} from 'svelte';
	import {DotType} from './types.js';
	import {filterIndexes, filterLayouts, normalizeData, transformData} from './transform-data.js';
	import {hslFn, scatterPlot} from './draw.js';
	import {type LayoutNestingLevels, type LayoutOptions} from '$types';

	// Global constants
	const layoutAlgorithms: LayoutOptions[] = ['layerTree', 'circular', 'forceBased'];
	const nestingLevels: LayoutNestingLevels[] = ['inner', 'intermediate', 'root'];

	export let data;
	let indexX: number = 0;
	let indexY: number = 1;
	let indexFilterCutOff: number | null = 11000;
	let indexFilterFiles: Set<string> = new Set();
	let dotType: DotType = DotType.Flag;
	let fileNames: Set<string> = new Set();
	let filterFiles: Set<string> = new Set();
	let rerender: () => void;
	let layoutFilter: Map<LayoutNestingLevels, Map<LayoutOptions, boolean>> = new Map();

	// (Just so we can log this to the ui)
	let dataPointCount: number;
	let topNData: {[fileName: string]: number} = {};

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
		// ['Forces', [['Forces', DotType.Forces]]],
	];

	function render() {
		const transformed1 = transformData(data);
		fileNames = transformed1.fileNames;
		indexFilterFiles = new Set(fileNames);
		filterFiles = new Set(fileNames);

		transformed1.transformedData = normalizeData(
			transformed1.transformedData,
			transformed1.identifiers,
			fileNames,
		);

		return () => {
			const transformed2 = filterIndexes(
				indexFilterCutOff,
				indexFilterFiles,
				filterFiles,
				transformed1.transformedData,
				transformed1.identifiers,
			);

			dataPointCount = transformed2.transformedData[0].length;
			topNData = transformed2.countFile;

			const transformed3 = filterLayouts(
				layoutFilter,
				transformed2.transformedData,
				transformed2.identifiers,
				data.jsonData,
			);

			scatterPlot(
				transformed3.transformedData,
				transformed3.identifiers,
				indexX,
				indexY,
				dotType,
				data.jsonData,
			);
		};
	}

	// Initialize layoutFilter map
	nestingLevels.forEach(level => {
		layoutFilter.set(level, new Map());
		layoutAlgorithms.forEach(algo => {
			layoutFilter.get(level)!.set(algo, true);
		});
	});

	onMount(() => {
		// Now render all data, etc.
		rerender = render();
		rerender();
	});
</script>

<div class="p-6 h-full w-full overflow-hidden">
	<Heading>Explore layout evaluations</Heading>
	<div class="flex flex-row items-start overflow-x-auto text-nowrap">
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
			<p class="text-right w-full">
				Loaded {data.evaluationResults.length} datapoints
			</p>
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
			{#if dataPointCount !== undefined}
				<p class="text-left w-full ml-3">({dataPointCount} left after filtering)</p>
			{/if}
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
		<div class="flex flex-col ml-5 mr-5">
			<p class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
				Use these files for filtering top n
			</p>
			{#each fileNames as fn}
				<div>
					<input
						id="{fn}-filter"
						type="checkbox"
						checked={indexFilterFiles.has(fn)}
						on:change={e => {
							//@ts-ignore
							if (e.target.checked) {
								indexFilterFiles.add(fn);
							} else {
								indexFilterFiles.delete(fn);
							}
							rerender();
						}}
					/>
					<label for="{fn}-filter"
						>{fn}
						{#if topNData[fn]}
							({topNData[fn]})
						{/if}
					</label>
				</div>
			{/each}
		</div>
		<div class="flex flex-col items-center">
			<p class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
				Show only datapoints from file
			</p>
			{#each fileNames as fn}
				<div>
					<input
						id="{fn}-filter2"
						type="checkbox"
						checked={filterFiles.has(fn)}
						on:change={e => {
							//@ts-ignore
							if (e.target.checked) {
								filterFiles.add(fn);
							} else {
								filterFiles.delete(fn);
							}
							rerender();
						}}
					/> <label for="{fn}-filter2">{fn}</label>
				</div>
			{/each}
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
		<div class="flex flex-col ml-5">
			<p class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Filter by layout</p>
			<div class="flex flex-row">
				{#each nestingLevels.toReversed() as level}
					<div class="flex flex-col mr-5">
						<p class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">{level}</p>
						{#each layoutAlgorithms as layout}
							<div class="flex flex-row">
								<input
									type="checkbox"
									id="{level}-{layout}-filter"
									checked={layoutFilter.get(level)?.get(layout)}
									on:change={e => {
										//@ts-ignore
										layoutFilter.get(level)?.set(layout, e.target.checked);
										rerender();
									}}
								/>
								<label class="ml-1" for="{level}-{layout}-filter">{layout}</label>
							</div>
						{/each}
					</div>
				{/each}
			</div>
		</div>
		<div class="w-500">
			<div class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Legend:</div>
			{#if [DotType.Flag, DotType.NestedCircles, DotType.OnlyRoot, DotType.OnlyIntermediate, DotType.OnlyLeaf].includes(dotType)}
				<div style="color: #4682B4">LayerTree</div>
				<div style="color: #FF6347">Circular</div>
				<div style="color: #9ACD32">ForceBased</div>
			{/if}
			{#if [DotType.EdgePorts, DotType.Forces].includes(dotType)}
				<div style="color: #B8860B">True</div>
				<div style="color: #8A2BE2">False</div>
			{/if}
			{#if [DotType.NodeSize, DotType.NodePadding, DotType.NodeMarginRoot, DotType.NodeMarginIntermediate, DotType.NodeMarginLeaf].includes(dotType)}
				<div class="flex flex-row">
					{#each [[0, 10, 20], [30, 40, 50]] as ns}
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
