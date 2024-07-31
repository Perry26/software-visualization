<script lang="ts">
	import {
		type LayoutNestingLevels,
		type LayoutOptions,
		type DrawSettingsInterface,
		type RawInputType,
	} from '$types';
	import Button from '$ui/button.svelte';
	import Heading from '$ui/heading.svelte';
	import {makeDefaultDrawSettings} from '../../default-objects';
	import merge from 'lodash/merge';
	import sample from 'lodash/sample';
	import noop from 'lodash/noop';
	import random from 'lodash/random';
	import {converter, createGraphData, draw, filter} from '$scripts';
	import {LayoutMetrics} from '$scripts/draw/metrics';
	//@ts-ignore
	import * as hash from 'object-hash';

	const amountOfIterations = 100;

	let files: FileList;
	let hashFiles: FileList;
	let canvasContainer: HTMLElement;

	// Variables containing output
	let evaluationOutput: string = '';
	let hashOutput: string = '';
	let debugOutput: string = '';
	let settingsOutput: string = '';
	let doneOutput: string = '';
	let failedOutput: string = '';

	const getSeparator = (i: number, j: number) => `-------${i}-${j}_______\n`;

	async function parseFile(file: File) {
		const rawData = JSON.parse(await file.text());
		rawData.fileName = files[0].name;
		return rawData as RawInputType;
	}

	async function parseHashFile(file: File): Promise<string[]> {
		return (await file.text()).split('\n');
	}

	/** Generates random drawSettings */
	function getRandomDrawSettings(
		bannedHashes: string[],
		randomRawData: RawInputType,
	): DrawSettingsInterface {
		const settings = makeDefaultDrawSettings();

		const layoutAlgorithms: LayoutOptions[] = ['layerTree', 'circular', 'forceBased'];
		const nestingLevels: LayoutNestingLevels[] = ['inner', 'intermediate', 'root'];

		settings.minimumNodeSize = random(0, 20) * 5;
		settings.nodePadding = random(0, 20) * 5;
		settings.showEdgePorts = sample([true, false]);
		settings.innerLayout = sample(layoutAlgorithms)!;

		nestingLevels.forEach(level => {
			settings.nodeMargin[level] = random(0, 20) * 5;
			settings[`${level}Layout`] = sample(layoutAlgorithms)!;

			// Now it gets fun: layout specific settings :)
			// Start with force-based
			if (settings[`${level}Layout`] !== 'forceBased') {
				settings.layoutSettings[level].centerForceStrength = {enabled: false, x: 0, y: 0};
				settings.layoutSettings[level].collideRectangles = false;
				settings.layoutSettings[level].linkForce = {enabled: false, distance: 0, strength: 0};
				settings.layoutSettings[level].manyBodyForce = {type: 'None', strength: 0};
			} else {
				if (sample([true, false])) {
					settings.layoutSettings[level].centerForceStrength = {
						enabled: true,
						x: random(0, 20) * 2.5,
						y: random(0, 20) * 2.5,
					};
				} else {
					settings.layoutSettings[level].centerForceStrength = {
						enabled: false,
						x: 0,
						y: 0,
					};
				}
				settings.layoutSettings[level].collideRectangles = sample([true, false]);
				if (sample([true, false])) {
					settings.layoutSettings[level].linkForce = {
						enabled: true,
						distance: random(0, 20) * 5,
						strength: random(0, 20) * 0.1,
					};
				} else {
					settings.layoutSettings[level].linkForce = {
						enabled: false,
						distance: 0,
						strength: 0,
					};
				}

				const mbType = sample(['Charge', 'Rectangular', 'None']);
				if (mbType !== 'None') {
					settings.layoutSettings[level].manyBodyForce = {
						type: mbType as any,
						strength: random(0, 20) * 2.5,
					};
				} else {
					settings.layoutSettings[level].manyBodyForce = {
						type: 'None',
						strength: 0,
					};
				}
			}

			if (settings[`${level}Layout`] !== 'layerTree') {
				settings.layoutSettings[level].uniformSize = false;
			} else {
				settings.layoutSettings[level].uniformSize = sample([true, false]);
			}
		});

		// Recurse if we're already explored this hash
		const thisHash = hash({rawData: randomRawData, drawSettings: settings});
		if (bannedHashes.includes(thisHash)) {
			return getRandomDrawSettings(bannedHashes, randomRawData);
		} else {
			bannedHashes.push(thisHash);
			return settings;
		}
	}

	async function run(files: FileList) {
		let bannedHashes: string[] = [];
		if (hashFiles.length > 0) {
			bannedHashes = await parseHashFile(hashFiles[0]);
		}

		if (!files || files.length === 0) {
			debugOutput += 'No input files loaded!\n';
			return;
		}
		debugOutput += `Started checking ${files.length} files\n`;

		// Parse data
		const rawData: RawInputType[] = [];
		for (let i = 0; i < files.length; i++) {
			const data = await parseFile(files[i]);
			data.fileName = files[i].name;
			rawData.push(data);
		}

		// Make object of all drawSettings we're considering
		const variations = [...Array(amountOfIterations).keys()].map(_ =>
			getRandomDrawSettings(bannedHashes, rawData[0]),
		);

		// Now run the variations on all input files
		variations.forEach(async (variation, i) => {
			const drawSettings: DrawSettingsInterface = merge(makeDefaultDrawSettings(), variation);
			settingsOutput += getSeparator(i, 0) + JSON.stringify(drawSettings) + '\n';
			rawData.forEach(async (rawData, j) => {
				const thisHash = hash({rawData, drawSettings});

				// Prepare a container for rendering (the code requires that)
				const canvas: SVGElement = document.createElement('svg') as unknown as SVGElement;
				canvasContainer.appendChild(canvas);

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
					debugOutput += 'Layout algorithm failed\n\n';
					failedOutput += getSeparator(i, j) + thisHash + '\n' + rawData.fileName;
					hashOutput += getSeparator(i, j) + thisHash + '\n';
					return;
				}

				// Run evaluator
				let evaluator = new LayoutMetrics();
				evaluator.setData(graphData);
				const {evaluationData} = evaluator.run();

				// Output text
				evaluationOutput += getSeparator(i, j) + evaluationData.map(data => data[1]).join(';');
				hashOutput += getSeparator(i, j) + thisHash + '\n';

				// Cleanup
				canvas.remove();
			});
		});

		// Runtime: 1,5 second per item

		doneOutput = 'Done';
	}
</script>

<Heading>Input raw data</Heading>
<label for="uploader">Upload a json file:</label><br />
<input
	accept="application/json"
	bind:files
	id="json-uploader"
	name="uploader"
	type="file"
	multiple={true}
	on:change={() => {
		doneOutput = '';
	}}
/>

<input
	accept="text"
	bind:files={hashFiles}
	id="hashFile-uploader"
	name="uploader"
	type="file"
	multiple={false}
	on:change={() => {
		doneOutput = '';
	}}
/>

<br />
<Button id="run-button" onClick={async () => run(files)}>Run</Button>

<div>
	<Heading>Console</Heading>
	<p id="debug-output" class="font-mono whitespace-pre">{@html debugOutput}</p>
	<p id="settings-output" class="font-mono whitespace-pre">{@html settingsOutput}</p>
	<p id="evaluation-output" class="font-mono whitespace-pre">{@html evaluationOutput}</p>
	<p id="failed-output" class="font-mono whitespace-pre">{@html failedOutput}</p>
	<p id="hash-output" class="font-mono whitespace-pre">{@html hashOutput}</p>
	<p id="done-output" class="font-mono whitespace-pre">{@html doneOutput}</p>
</div>

<!-- Dummy node for rendering canvasses. Should be unnecessary -->
<div style="display: none" bind:this={canvasContainer} />
