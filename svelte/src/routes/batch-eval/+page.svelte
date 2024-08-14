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

	const amountOfIterations = 50;

	let files: FileList;
	let hashFiles: FileList;
	let canvasContainer: HTMLElement;

	// Variables containing output
	let debugOutput: string = '';
	let evaluationOutput: HTMLParagraphElement;
	let hashOutput: HTMLParagraphElement;
	let settingsOutput: HTMLParagraphElement;
	let doneOutput: string = '';
	let failedOutput: HTMLParagraphElement;
	let svgOutput: HTMLParagraphElement;

	async function parseFile(file: File) {
		const rawData = JSON.parse(await file.text());
		rawData.fileName = files[0].name;
		return rawData as RawInputType;
	}

	async function parseHashFile(file: File): Promise<string[]> {
		return (await file.text()).split('\n');
	}

	/** Generates random drawSettings */
	function getRandomDrawSettings(bannedHashes: string[]): DrawSettingsInterface & {hash: string} {
		const settings = makeDefaultDrawSettings();
		//@ts-ignore we don't want to have this for hashing reasons
		delete settings.shownEdgesType;

		const layoutAlgorithms: LayoutOptions[] = ['layerTree', 'circular', 'forceBased'];
		const nestingLevels: LayoutNestingLevels[] = ['inner', 'intermediate', 'root'];

		settings.minimumNodeSize = 50;
		settings.nodePadding = random(1, 5) * 5;
		settings.showEdgePorts = sample([true, false]);

		nestingLevels.forEach(level => {
			settings.nodeMargin[level] = random(1, 5) * 10;
			settings[`${level}Layout`] = sample(layoutAlgorithms)!;

			// Now it gets fun: layout specific settings :)
			// Start with force-based
			if (settings[`${level}Layout`] !== 'forceBased') {
				settings.layoutSettings[level].centerForceStrength = {enabled: false, x: 0, y: 0};
				settings.layoutSettings[level].collideRectangles = false;
				settings.layoutSettings[level].linkForce = {enabled: false, distance: 0, strength: 0};
				settings.layoutSettings[level].manyBodyForce = {type: 'None', strength: 0};
			} else {
				settings.layoutSettings[level].centerForceStrength = {
					enabled: true,
					x: 0.1,
					y: 0.1,
				};
				settings.layoutSettings[level].collideRectangles = true;

				settings.layoutSettings[level].linkForce = {
					enabled: true,
					distance: settings.nodePadding * 1.5,
					strength: 1,
				};

				const mbType = sample(['Charge', 'Rectangular', 'None']);
				if (mbType !== 'None') {
					settings.layoutSettings[level].manyBodyForce = {
						type: mbType as any,
						strength: 20,
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
		const thisHash = hash(settings);
		if (bannedHashes.includes(thisHash)) {
			return getRandomDrawSettings(bannedHashes);
		} else {
			bannedHashes.push(thisHash);
			return {...settings, hash: thisHash};
		}
	}

	function writeOutput(parent: HTMLElement, output: string, hash: string, filename?: string) {
		const element = document.createElement('p');
		element.innerText = output;
		element.setAttribute('id', `${hash}${filename ? `-${filename}` : ''}`);
		parent.appendChild(element);
	}

	async function run(files: FileList) {
		let bannedHashes: string[] = [];
		if (hashFiles && hashFiles.length > 0) {
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
			getRandomDrawSettings(bannedHashes),
		);

		// Now run the variations on all input files
		variations.forEach(async (variation, i) => {
			const drawSettings: DrawSettingsInterface = merge(makeDefaultDrawSettings(), variation);
			const thisHash = variation.hash;

			writeOutput(settingsOutput, JSON.stringify(drawSettings), thisHash);
			writeOutput(hashOutput, thisHash, thisHash);
			rawData.forEach(async (rawData, j) => {
				// Prepare a container for rendering (the code requires that)
				const canvas: SVGElement = document.createElement('svg') as unknown as SVGElement;
				canvas.setAttribute('id', `${thisHash}-${rawData.fileName}`);
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
					writeOutput(failedOutput, `${thisHash};${rawData.fileName}`, thisHash, rawData.fileName);
					return;
				}

				// Run evaluator
				let evaluator = new LayoutMetrics();
				evaluator.setData(graphData);
				const {evaluationData} = evaluator.run();

				// Output text
				writeOutput(
					evaluationOutput,
					[...evaluationData.map(data => data[1]), thisHash, rawData.fileName].join(';'),
					thisHash,
					rawData.fileName,
				)!;

				// Output svg
				const {maxX, minX, maxY, minY} = evaluator.getBoundaries();
				const padding = drawSettings.nodePadding ?? 20;

				const svgText =
					`<svg viewBox="${minX - padding}, ${minY - padding}, ${maxX - minX + 2 * padding}, ${
						maxY - minY + 2 * padding
					}" style="background-color: white" xmlns="http://www.w3.org/2000/svg">` +
					`<rect x="${minX - padding - 1}" y="${minY - padding - 1}" width="${
						maxX - minX + 2 * padding + 2
					}" height="${maxY - minY + 2 * padding + 2}" fill="white" />` +
					canvas.innerHTML +
					'</svg>';
				writeOutput(svgOutput, svgText, thisHash, rawData.fileName);

				// Cleanup
				canvas.remove();
			});
		});

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
	<p id="settings-output" class="font-mono whitespace-pre" bind:this={settingsOutput} />
	<p id="evaluation-output" class="font-mono whitespace-pre" bind:this={evaluationOutput} />
	<p id="failed-output" class="font-mono whitespace-pre" bind:this={failedOutput} />
	<p id="hash-output" class="font-mono whitespace-pre" bind:this={hashOutput} />
	<p id="svg-output" class="font-mono whitespace-pre" bind:this={svgOutput} />
	<p id="done-output" class="font-mono whitespace-pre">{@html doneOutput}</p>
</div>

<div style="display: none" bind:this={canvasContainer} />
