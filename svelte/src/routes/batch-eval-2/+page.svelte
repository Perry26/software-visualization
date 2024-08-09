<script lang="ts">
	import {type DrawSettingsInterface, type RawInputType, EdgeType} from '$types';
	import Button from '$ui/button.svelte';
	import {makeDefaultDrawSettings} from '../../default-objects';
	import noop from 'lodash/noop';
	import {converter, createGraphData, draw, filter} from '$scripts';
	import {LayoutMetrics} from '$scripts/draw/metrics';

	let jsonFiles: FileList;
	let drawSettingsFiles: FileList;
	let canvasContainer: HTMLElement;

	// Variables containing output
	let evaluationOutput: string = '';
	let failedOutput: string = '';
	let doneOutput: string = '';
	let svgOutput: string = '';

	async function parseRawDataFile(file: File) {
		const rawData = JSON.parse(await file.text());
		rawData.fileName = jsonFiles[0].name;
		return rawData as RawInputType;
	}

	async function parseDrawSettingsFile(file: File) {
		let drawSettings = JSON.parse((await file.text()).split(';')[0]) as DrawSettingsInterface;
		drawSettings = {...makeDefaultDrawSettings(), ...drawSettings};

		drawSettings.shownEdgesType = new Map();
		drawSettings.shownEdgesType.set(EdgeType.calls, true);

		return drawSettings;
	}

	async function run() {
		if (!jsonFiles || jsonFiles.length === 0) {
			return;
		}
		if (!drawSettingsFiles || drawSettingsFiles.length === 0) {
			return;
		}

		// Parse data
		const rawData = await parseRawDataFile(jsonFiles[0]);
		rawData.fileName = jsonFiles[0].name;

		// Make object of all drawSettings we're considering
		const drawSettings = await parseDrawSettingsFile(drawSettingsFiles[0]);

		// Prepare a container for rendering (the code requires that)
		const canvas: SVGElement = document.createElement('svg') as unknown as SVGElement;
		canvasContainer.appendChild(canvas);
		canvas.setAttribute('style', 'width: 100%; height: 100%');

		// Now execute all of the steps
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
			failedOutput = 'Fail';
			doneOutput = 'Done';
			return;
		}

		// Run evaluator
		let evaluator = new LayoutMetrics();
		evaluator.setData(graphData);
		const {evaluationData} = evaluator.run();

		// Output text
		evaluationOutput = evaluationData.map(data => data[1]).join(';');

		// Output svg
		const content = canvas.innerHTML;
		const {maxX, minX, maxY, minY} = evaluator!.getBoundaries();
		const padding = drawSettings.nodePadding ?? 20;

		svgOutput =
			`<svg viewBox="${minX - padding}, ${minY - padding}, ${maxX - minX + 2 * padding}, ${
				maxY - minY + 2 * padding
			}" style="background-color: white" xmlns="http://www.w3.org/2000/svg">` +
			`<rect x="${minX - padding - 1}" y="${minY - padding - 1}" width="${
				maxX - minX + 2 * padding + 2
			}" height="${maxY - minY + 2 * padding + 2}" fill="white" />` +
			content +
			'</svg>';

		// Signal that we're done
		doneOutput = 'Done';
	}
</script>

<input
	accept="application/json"
	bind:files={jsonFiles}
	id="json-uploader"
	name="uploader"
	type="file"
	multiple={false}
	on:change={() => {
		doneOutput = '';
	}}
/>

<input
	accept="text"
	bind:files={drawSettingsFiles}
	id="drawSettings-uploader"
	name="uploader"
	type="file"
	multiple={false}
	on:change={() => {
		doneOutput = '';
	}}
/>

<br />
<Button id="run-button" onClick={async () => run()}>Run</Button>

<div>
	<p id="evaluation-output" class="font-mono whitespace-pre">{@html evaluationOutput}</p>
	<p id="failed-output" class="font-mono whitespace-pre">{@html failedOutput}</p>
	<p id="done-output" class="font-mono whitespace-pre">{@html doneOutput}</p>
	<textarea id="svg-output" bind:value={svgOutput} />
</div>

<div style="width: 100%; height: 100%" bind:this={canvasContainer} />
