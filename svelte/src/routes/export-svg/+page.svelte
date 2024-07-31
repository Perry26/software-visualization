<script lang="ts">
	import {converter, createGraphData, draw, filter} from '$scripts';
	import {LayoutMetrics} from '$scripts/draw/metrics';
	import {type DrawSettingsInterface, EdgeType, type RawInputType} from '$types';
	import Heading from '$ui/heading.svelte';
	import noop from 'lodash/noop';

	let jsonFiles: FileList;
	let drawSettingsFiles: FileList;
	let canvas: SVGElement;

	let svgString: string = '';

	let doneOutput: string = '';

	async function run() {
		if (jsonFiles.length < 1 || drawSettingsFiles.length < 1) {
			return;
		}
		canvas.innerHTML = '';

		// Parse input data
		const rawData = JSON.parse(await jsonFiles[0].text()) as RawInputType;

		// Parse drawsettings
		const drawSettings = JSON.parse(
			(await drawSettingsFiles[0].text()).split(';')[0],
		) as DrawSettingsInterface;
		drawSettings.shownEdgesType = new Map();
		drawSettings.shownEdgesType.set(EdgeType.calls, true);

		// Now execute all of the steps to render the image
		const convertedData = converter(rawData, {
			filterPrimitives: true,
			filterAllEncompassingNodes: true,
		});
		const graphData = createGraphData(convertedData);
		filter(
			{
				collapsedNodes: [],
				dependencyLifting: [],
				dependencyTolerance: 0,
				hideHierarchicalEdges: undefined,
			},
			graphData,
		);

		try {
			draw(canvas, graphData, drawSettings, noop, noop)(drawSettings);
		} catch (e) {
			console.error(e);
			doneOutput = 'Done';
		}

		// We need an evaluator to convert to svg file
		const evaluator = new LayoutMetrics();
		evaluator.setData(graphData);

		// Finally, get the output string to save an svg image:
		const content = document.getElementById('canvas')!.innerHTML;
		const {maxX, minX, maxY, minY} = evaluator!.getBoundaries();
		const padding = drawSettings.nodePadding ?? 20;

		svgString =
			`<svg viewBox="${minX - padding}, ${minY - padding}, ${maxX - minX + 2 * padding}, ${
				maxY - minY + 2 * padding
			}" style="background-color: white" xmlns="http://www.w3.org/2000/svg">` +
			`<rect x="${minX - padding - 1}" y="${minY - padding - 1}" width="${
				maxX - minX + 2 * padding + 2
			}" height="${maxY - minY + 2 * padding + 2}" fill="white" />` +
			content +
			'</svg>';

		doneOutput = 'Done';
	}
</script>

<Heading>Input files</Heading>
<label for="uploader">Upload a json file:</label><br />
<input
	accept="application/json"
	bind:files={jsonFiles}
	id="json-uploader"
	name="json-uploader"
	type="file"
	multiple={false}
/>

<input
	accept="text"
	bind:files={drawSettingsFiles}
	id="drawSettings-uploader"
	name="drawSettings-uploader"
	type="file"
	multiple={false}
/>

<input
	type="button"
	value="run"
	id="run-button"
	on:click={() => {
		run();
	}}
/>

<p id="done-output" class="font-mono whitespace-pre">{@html doneOutput}</p>

<!-- SVG canvas to render to -->
<svg id="canvas" style="display: none;" bind:this={canvas} />

<textarea id="svg-for-file" bind:value={svgString} />
