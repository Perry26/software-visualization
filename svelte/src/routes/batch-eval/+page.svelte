<script lang="ts">
	import {type DrawSettingsInterface, type RawInputType} from '$types';
	import Button from '$ui/button.svelte';
	import Heading from '$ui/heading.svelte';
	import {makeDefaultDrawSettings} from '../../default-objects';
	import merge from 'lodash/merge';
	import sampleSize from 'lodash/sampleSize';
	import range from 'lodash/range';
	import noop from 'lodash/noop';
	import {converter, createGraphData, draw, filter} from '$scripts';
	import {LayoutMetrics} from '$scripts/draw/metrics';

	let files: FileList;
	let textOutput: string = '';
	let canvasContainer: HTMLElement;

	type SettingsVariationType = {[property: string]: any[]};

	async function parseFile(file: File) {
		const rawData = JSON.parse(await file.text());
		rawData.fileName = files[0].name;
		return rawData as RawInputType;
	}

	/** Helper function for variate */
	function addCartesian(obj: SettingsVariationType, prop: string, array: any[]) {
		const result: any = [];
		obj[prop].forEach(newValue => {
			array.forEach(existingValues => {
				result.push({...existingValues, [prop]: newValue});
			});
		});
		return result;
	}

	/** Input: an object containing values, where each property is an array of variations to consider
	 * Output: All possible combinations of variations, in an array of objects
	 */
	function variate(obj: SettingsVariationType): Object[] {
		let variations = [{}];
		for (const property in obj) {
			variations = addCartesian(obj, property, variations);
		}
		return variations;
	}

	async function run(files: FileList) {
		if (!files || files.length === 0) {
			textOutput += 'No input files loaded!\n';
			return;
		}
		textOutput += `Started checking ${files.length} files\n`;

		// Parse data
		const rawData: RawInputType[] = [];
		for (let i = 0; i < files.length; i++) {
			rawData.push(await parseFile(files[i]));
		}
		textOutput += 'Raw data parsed\n';

		// Make object of all drawSettings we're considering
		// TODO randomize
		// TODO filter invalid combo's
		const nodeMarginOptions: SettingsVariationType = {
			inner: range(10, 101, 10),
			intermediate: range(10, 101, 10),
			root: range(10, 101, 10),
		}; //1000

		const subLayoutSettingsOptions: SettingsVariationType = {
			uniformSize: [true, false],
		};

		const layoutSettingsOptions: SettingsVariationType = {
			inner: variate(subLayoutSettingsOptions),
			intermediate: variate(subLayoutSettingsOptions),
			root: variate(subLayoutSettingsOptions),
		}; // 8

		const drawSettingsOptions: SettingsVariationType = {
			minimumNodeSize: range(10, 101, 10),
			nodePadding: range(10, 101, 10),
			nodeMargin: variate(nodeMarginOptions),
			// showEdgePorts: [true, false],
			// innerLayout: ['layerTree', 'circular', 'forceBased'],
			// intermediateLayout: ['layerTree', 'circular', 'forceBased'],
			// rootLayout: ['layerTree', 'circular', 'forceBased'],
			// layoutSettings: variate(layoutSettingsOptions),
		};

		console.log(variate(layoutSettingsOptions), variate(nodeMarginOptions));

		const variations = variate(drawSettingsOptions);
		textOutput += 'Loaded variations in memory';

		// Now run the variations on all input files
		sampleSize(variations, 1).forEach(async v => {
			const drawSettings: DrawSettingsInterface = merge(makeDefaultDrawSettings(), v);
			rawData.forEach(async rawData => {
				// Prepare a container for rendering (the code requires that)
				const canvas: SVGElement = document.createElement('svg') as unknown as SVGElement;
				canvasContainer.appendChild(canvas);

				// No execute all of the steps
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
					textOutput += 'Layout algorithm failed\n\n';
					return;
				}

				// Run evaluator
				let evaluator = new LayoutMetrics();
				evaluator.setData(graphData);
				const {evaluationData, copyString} = evaluator.run();

				// Output text
				textOutput += 'Evaluation results\n' + copyString + '\n';

				// Cleanup
				canvas.remove();
			});
		});

		// Runtime: 1,5 second per item
	}
</script>

<Heading>Input raw data</Heading>
<label for="uploader">Upload a json file:</label><br />
<input
	accept="application/json"
	bind:files
	id="uploader"
	name="uploader"
	type="file"
	multiple={true}
/>
<br />
<Button onClick={async () => run(files)}>Run</Button>

<div>
	<Heading>Console</Heading>
	<p class="font-mono whitespace-pre">{@html textOutput}</p>
</div>

<!-- Dummy node for rendering canvasses. Should be unnecessary -->
<div style="display: none" bind:this={canvasContainer} />
