<script lang="ts">
	import {converter, createGraphData, draw, filter} from '$scripts';
	import {LayoutMetrics} from '$scripts/draw/metrics';
	import type {
		DrawSettingsInterface,
		EdgeType,
		LayoutNestingLevels,
		LayoutOptions,
		ManyBodyForceOptions,
		RawInputType,
	} from '$types';
	/*
	 * Article about library: https://medium.com/@martin_stoyanov/hpjs-hyperparameter-optimization-for-javascript-8f78aa7a3368
	 * Git repo: https://github.com/atanasster/hyperparameters
	 *
	 * JS library has been based on http://hyperopt.github.io/hyperopt/
	 */
	import Heading from '$ui/heading.svelte';
	//@ts-ignore
	import * as hp from 'hyperparameters';

	function voidFn(...args: any[]) {}

	const defaultDrawSettings: DrawSettingsInterface = {
		minimumNodeSize: 50,
		buttonRadius: 5,
		nodeCornerRadius: 5,
		nodePadding: 20,
		nodeMargin: {
			inner: 30,
			intermediate: 30,
			root: 30,
		},
		textSize: 10,
		shownEdgesType: new Map<EdgeType, boolean>(),
		showEdgeLabels: false,
		showNodeLabels: true,
		showEdgePorts: true,
		colorFromBottom: true,
		invertPortColors: false,
		nodeDefaultColor: '#6a6ade',
		nodeColors: ['#32a875', '#d46868'],
		innerLayout: 'layerTree',
		intermediateLayout: 'layerTree',
		rootLayout: 'layerTree',
		layoutSettings: {
			inner: {
				uniformSize: true,
				manyBodyForce: {
					type: 'Rectangular',
					strength: 30,
				},
				collideRectangles: true,
				centerForceStrength: {
					enabled: true,
					x: 0.1,
					y: 0.1,
				},
				linkForce: {
					enabled: true,
					distance: 30,
					strength: 1,
				},
			},
			intermediate: {
				uniformSize: true,
				manyBodyForce: {type: 'Rectangular', strength: 30},
				collideRectangles: true,
				centerForceStrength: {
					enabled: true,
					x: 0.1,
					y: 0.1,
				},
				linkForce: {
					enabled: true,
					distance: 30,
					strength: 1,
				},
			},
			root: {
				uniformSize: true,
				manyBodyForce: {
					type: 'Rectangular',
					strength: 30,
				},
				collideRectangles: true,
				centerForceStrength: {
					enabled: true,
					x: 0.1,
					y: 0.1,
				},
				linkForce: {
					enabled: true,
					distance: 30,
					strength: 1,
				},
			},
		},
	};

	let files: FileList;
	let rawData: RawInputType = {};
	let canvasContainer: HTMLElement;

	const layoutNestingLevels: LayoutNestingLevels[] = ['inner', 'intermediate', 'root'];
	let layoutOptions: LayoutOptions[] = ['layerTree', 'straightTree', 'circular', 'forceBased'];
	let manyBodyForceOptions: ManyBodyForceOptions[] = ['Charge', 'Rectangular', 'None'];

	const hyperParameterSpace: any = {
		minimumNodeSize: hp.uniform(0, 100),
		nodePadding: hp.uniform(0, 100),
		nodeMargin: {},
		layoutSettings: {},
	};

	layoutNestingLevels.forEach(level => {
		hyperParameterSpace.nodeMargin[level] = hp.uniform(0, 100);
		hyperParameterSpace[`${level}Layout`] = hp.choice([...layoutOptions]);
		hyperParameterSpace.layoutSettings[level] = {
			uniformSize: hp.choice([true, false]),
			forceManyBody: {
				type: hp.choice([...manyBodyForceOptions]),
				strength: hp.uniform(0, 50),
			},
			// TODO
		};
	});

	/** Stores all canvasses, in case we want to output them for debugging */
	function getValue(hyperParameters: any) {
		var canvas: SVGElement = document.createElement('svg') as unknown as SVGElement;
		canvasContainer.appendChild(canvas);

		const drawSettings: DrawSettingsInterface = {...defaultDrawSettings, ...hyperParameters};

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

		let [successCount, degenerateCount] = [0, 0];
		try {
			draw(canvas, graphData, drawSettings, voidFn, voidFn)(drawSettings);
			successCount++;
		} catch (e) {
			degenerateCount++;
			return {loss: Infinity, status: hp.STATUS_FAIL};
		}

		let evaluator = new LayoutMetrics();
		evaluator.setData(graphData);

		const {rawData: evaluationResults} = evaluator.run();
		const result = evaluationResults.find(([s, _]) => s === 'Line intersections')![1];
		return {loss: result, status: hp.STATUS_OK};
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
	on:change={async () => {
		let text = await files[0].text();

		rawData = JSON.parse(text);
		rawData.fileName = files[0].name;
	}}
/> <br />

<input
	type="button"
	on:click={async _ => {
		//@ts-ignore
		canvasContainer = document.getElementById('canvas-container');
		canvasContainer.innerHTML = '';

		hp.fmin(getValue, hyperParameterSpace, hp.search.randomSearch, 10, {
			rng: new hp.RandomState(123456),
		}).then(result => {
			console.log(result);
			console.log('min', result.argmin);
			console.log('max', result.argmax);
		});
	}}
	value={'Optimize hyper parameters'}
	class="w-64 bg-transparent hover:bg-blue-500 text-blue-700 font-semibold hover:text-white py-2 px-4 border border-blue-500 hover:border-transparent rounded"
/>

<div style="display: none" id="canvas-container" />
