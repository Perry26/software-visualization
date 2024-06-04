import * as d3 from 'd3';
import {notNaN} from '$helper';
import type {
	DrawSettingsInterface,
	EdgePortMap,
	GraphData,
	GraphDataNode,
	LayoutOptions,
} from '$types';

import {setupGradient} from './helper/gradient-setup';
import {
	circularLayout,
	forceBasedLayout,
	straightTreeLayout,
	layerTreeLayout,
	getDrawSettingsForLayout,
} from '../layouts';
import type {NodeLayout} from '$scripts/layouts/types';
import {renderLinks} from './link-render';
import {addDragAndDrop} from './drag-and-drop';
import {renderNodes, renderNodeLabels, addLiftCollapseButtons, renderPorts} from './nodes-render';
import {addEdgePorts} from './edge-routing';

export function draw(
	svgElement: SVGElement,
	graphData: GraphData,
	drawSettings: DrawSettingsInterface,
	onCollapse: (datum: GraphDataNode) => void,
	onLift: (datum: GraphDataNode) => void,
) {
	// CALCULATE LAYOUT
	// Transform graphData, split the nodes according to which layout-algorithm we are going to use.
	const {simpleNodes, innerNodes, intermediateNodes, rootNodes} = splitNodes(graphData.nodes);

	// Initialize width and height of simple nodes
	simpleNodes.forEach(n => {
		n.width = notNaN(drawSettings.minimumNodeSize);
		n.height = notNaN(drawSettings.minimumNodeSize);
	});

	// Initialize links routing
	graphData.links.forEach(link => {
		link.routing = [];
	});

	const layoutOptionToFunction: {[layout in LayoutOptions]: NodeLayout} = {
		circular: circularLayout,
		straightTree: straightTreeLayout,
		layerTree: layerTreeLayout,
		forceBased: forceBasedLayout,
	};

	// Calculate layouts for non-simple nodes
	innerNodes.forEach(n =>
		layoutOptionToFunction[drawSettings.innerLayout](
			getDrawSettingsForLayout(drawSettings, 'inner'),
			n.members,
			n,
		),
	);
	intermediateNodes.forEach(n =>
		layoutOptionToFunction[drawSettings.intermediateLayout](
			getDrawSettingsForLayout(drawSettings, 'intermediate'),
			n.members,
			n,
		),
	);
	rootNodes.forEach(n =>
		layoutOptionToFunction[drawSettings.intermediateLayout](
			getDrawSettingsForLayout(drawSettings, 'intermediate'),
			n.members,
			n,
		),
	);
	layoutOptionToFunction[drawSettings.rootLayout](
		getDrawSettingsForLayout(drawSettings, 'root'),
		rootNodes,
	); // Todo this is weird

	// ZOOM HANDLING
	// Create canvas to contain all elements, so we can transform it for zooming etc.
	const canvas = d3.select(svgElement).append('g').attr('id', 'canvas');
	const canvasElement = document.getElementById('canvas')!;

	// Add zoom handler
	d3.select(svgElement).call(
		d3.zoom<SVGElement, unknown>().on('zoom', ({transform}) => {
			canvas.attr('transform', transform);
			drawSettings.transformation = transform;
		}),
	);

	//Reload last transformation, if available
	if (drawSettings.transformation) {
		canvas.attr(
			'transform',
			`translate(${drawSettings.transformation.x}, ${drawSettings.transformation.y}) scale(${drawSettings.transformation.k})`,
		);
	}

	// Setup link canvas
	const linkCanvas = d3.select(canvasElement).append('g').attr('id', 'link-canvas');
	setupGradient(linkCanvas);

	let portMap: EdgePortMap;
	if (drawSettings.showEdgePorts) {
		portMap = addEdgePorts(graphData.links, graphData.flattenNodes, drawSettings);
	}

	/** Callback to rerender with new drawSettings, to prevent unnecessary rerenders
	 */

	function rerender(drawSettings: DrawSettingsInterface) {
		renderNodes(rootNodes, canvasElement, drawSettings);
		renderNodeLabels(canvasElement, drawSettings);
		portMap && renderPorts(portMap, canvasElement, drawSettings);
		addLiftCollapseButtons(canvasElement, drawSettings, onCollapse, onLift);
		addDragAndDrop(rootNodes, graphData.nodesDict, canvasElement, linkCanvas, drawSettings);

		renderLinks(graphData.links, graphData.nodesDict, linkCanvas, drawSettings);
	}
	return rerender;
}

/**
 * Splits node per layout-algorithm
 * TODO Maybe move to parser?
 */
function splitNodes(nodes: GraphDataNode[]) {
	const simpleNodes: GraphDataNode[] = [];
	const intermediateNodes: GraphDataNode[] = [];
	const innerNodes: GraphDataNode[] = [];
	const rootNodes: GraphDataNode[] = [];

	function recurse(node: GraphDataNode) {
		node.members.forEach(node => recurse(node));
		if (node.level === 0) {
			if (node.members.length === 0) {
				simpleNodes.push(node);
				// TODO, also weird, rethink the split
			}
			rootNodes.push(node);
		} else if (node.members.length === 0) {
			simpleNodes.push(node);
		} else if (
			node.members.reduce(
				(a: number, item) => (item.members.length ? (item.members.length > 0 ? a + 1 : a) : a),
				0,
			) === 0
		) {
			innerNodes.push(node);
		} else {
			intermediateNodes.push(node);
		}
	}

	nodes.forEach(node => recurse(node));

	return {simpleNodes, innerNodes, rootNodes, intermediateNodes};
}

export default draw;
