<script lang="ts">
	import {onMount} from 'svelte';

	import {debuggingConsole, extractAvailableEdgeType} from '$helper';
	import type {
		ConfigInterface,
		ConvertedData,
		DrawSettingsInterface,
		EdgeType,
		GraphDataNode,
		GraphData,
		RawInputType,
		RawDataConfigType,
	} from '$types';

	// scripts
	import {cleanCanvas, draw, filter, converter, createGraphData, getNodeColors} from '$scripts';

	// components
	import TabsComponent from './components/tabs-component.svelte';
	import RawDataInputer from './components/raw-data-inputer.svelte';
	import ConfigChanger from './components/config-changer.svelte';
	import DrawSettingsChanger from './components/draw-settings-changer.svelte';
	import EvaluationButton from './components/evaluator-button.svelte';
	import {LayoutMetrics} from '$scripts/draw/metrics';
	import LayoutChanger from './components/layout-changer.svelte';
	import {SidePanelTab} from '$types/ui';

	let sidePanelTab: SidePanelTab = SidePanelTab.Input;

	let redrawFunction = (_: DrawSettingsInterface) => {};
	let rawData: RawInputType = {};
	let convertedData: ConvertedData;
	let rawDataConfig: RawDataConfigType = {
		filterPrimitives: true,
		filterAllEncompassingNodes: true,
	};
	let flattenNodes: GraphDataNode[] = [];

	let config: ConfigInterface = {
		collapsedNodes: [],
		dependencyLifting: [],
		dependencyTolerance: 0,
		hideHierarchicalEdges: undefined,
	};
	let graphData: GraphData;
	let drawSettings: DrawSettingsInterface = {
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

	let svgElement: SVGElement | undefined = undefined;
	let evaluator: LayoutMetrics = new LayoutMetrics();
	let resetEvaluator: () => {};

	let doReconvert = true;
	let doRefilter = true;
	let doRedraw = true;
	let doRelayout = true;
	let isMounted = false;

	let maximumDepth: number = 0;

	function handleNodeCollapseClick(clickedNode: GraphDataNode) {
		debuggingConsole('clicked');
		// push if not exist
		if (!config.collapsedNodes.includes(clickedNode)) {
			config.collapsedNodes.push(clickedNode);
		} else {
			config.collapsedNodes = config.collapsedNodes.filter(node => node !== clickedNode);
		}
		// on finish
		doRefilter = true;
	}

	function handleDependencyLiftClick(clickedNode: GraphDataNode): void {
		debuggingConsole('clicked');

		// push if not exist
		if (!config.dependencyLifting.find(nodeConfig => nodeConfig.node.id === clickedNode.id)) {
			config.dependencyLifting.push({node: clickedNode, sensitivity: config.dependencyTolerance});
		} else {
			// remove if exist
			debuggingConsole('remove');
			config.dependencyLifting = config.dependencyLifting.filter(
				nodeConfig => nodeConfig.node.id !== clickedNode.id,
			);
		}

		// on finish
		doRefilter = true;
	}

	$: {
		if (isMounted) {
			// handle config changes
			if (doReconvert) {
				// will setup graphData. Will also setup shownEdgesType
				convertedData = converter(rawData, rawDataConfig);
				graphData = createGraphData(convertedData);
				flattenNodes = graphData.flattenNodes;

				// Initialize shownEdgesType
				extractAvailableEdgeType(graphData.links).forEach((e, index) =>
					drawSettings.shownEdgesType.set(e, index == 0 ? true : false),
				);

				doReconvert = false;
				doRefilter = true;

				evaluator.setData(graphData);
			}
			if (doRefilter) {
				filter(config, graphData);
				doRefilter = false;
				doRelayout = true;
				maximumDepth = graphData.maximumDepth;
			}

			if (doRelayout) {
				// remove the old data
				cleanCanvas(svgElement!);
				redrawFunction = draw(
					svgElement!,
					graphData,
					drawSettings,
					handleNodeCollapseClick,
					handleDependencyLiftClick,
				);
				doRedraw = true;
				doRelayout = false;

				resetEvaluator();
			}

			if (doRedraw) {
				redrawFunction(drawSettings);
			}
		}
	}
	onMount(() => {
		isMounted = true;
	});
</script>

<div class="flex justify-between h-full">
	<!-- canvas -->
	<div class="m-6 w-full">
		<svg bind:this={svgElement} class="w-full h-full" />
	</div>

	<!-- vertical line -->
	<div class="bg-neutral-300 w-[2px]" />

	<!-- sidepanel -->
	<div class="flex flex-col m-6">
		<TabsComponent bind:sidePanelTab />
		<br />

		<div
			class="overflow-y-auto overflow-x-hidden"
			style="display: {sidePanelTab === SidePanelTab.Input ? 'block' : 'none'}"
		>
			<RawDataInputer bind:rawData bind:doReconvert bind:rawDataConfig />
		</div>
		<div
			class="overflow-y-auto overflow-x-hidden"
			style="display: {sidePanelTab === SidePanelTab.Config ? 'block' : 'none'}"
		>
			<ConfigChanger bind:config bind:doRefilter bind:flattenNodes />
		</div>
		<div
			class="overflow-y-auto overflow-x-hidden"
			style="display: {sidePanelTab === SidePanelTab.DrawSettings ? 'block' : 'none'}"
		>
			<DrawSettingsChanger bind:drawSettings bind:doRedraw bind:maximumDepth />
		</div>
		<div
			class="overflow-y-auto overflow-x-hidden"
			style="display: {sidePanelTab === SidePanelTab.Layout ? 'block' : 'none'}"
		>
			<LayoutChanger bind:drawSettings bind:doRelayout />
		</div>
		<div
			class="overflow-y-auto overflow-x-hidden"
			style="display: {sidePanelTab === SidePanelTab.Evaluation ? 'block' : 'none'}"
		>
			<EvaluationButton bind:evaluator bind:resetEvaluator bind:fileName={rawData.fileName} />
		</div>
	</div>
</div>
