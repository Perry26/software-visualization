import type {GraphDataEdge, GraphDataNode} from '$types';
import {notNaN} from '$helper';
import {checkWidthHeight, filterEdges, centerize} from './helpers';
import type {NodeLayout, GraphDataNodeExt} from './types.ts';

/**
 * A layered tree using the Sugiyama method
 */

export const layerTreeLayout: NodeLayout = function (
	drawSettings,
	childNodes,
	parentNode?,
	options?,
) {
	if (childNodes.length === 0) return;

	/**
	 * Apply the Sugiyama method:
	 * 1. Discard edges until the graph is a DAG (implemented as finding a spanning DAG instead)
	 * 2. Assign layers
	 * 3. Vertex ordering
	 * 4. Coordinate assignment
	 */
	/** GraphDataNode extended with a property assigning a layer to the node
	 * The layer indicates at which layer the node will be rendered (top to bottom) */
	type LayerTreeNode = GraphDataNodeExt & {
		layer?: number;
	};
	/** Same as childNodes, but cast to the right type */
	const nodes = checkWidthHeight(childNodes) as LayerTreeNode[];

	/** Set containing all lifted edges between elements of childNodes */
	const allEdges: Set<GraphDataEdge> = new Set();
	childNodes.forEach(n => n.incomingLinksLifted.filter(filterEdges).forEach(l => allEdges.add(l)));

	/** DummyType for vertex ordering step */
	type DummyNode = {
		layer: number;
		height: number;
		width: number;
		x?: number;
		y?: number;
		/** The existence of this property is used to mark this node as a DummyNode */
		isDummy: true;
		/** In between steps 3 and 4, dummynodes are merged and deleted.
		 * If this node has been deleted, this property points to the merged node */
		realDummy?: DummyNode;
	};

	/** Array containing all layers, where layers themselves are stored.
	 * Layers themselves are modelled as arrays of nodes, where the position in the array indicated the position the node is rendered in.
	 *
	 * Dummynodes may be inserted in the vertex ordering step.
	 */
	const layerNodes: (LayerTreeNode | DummyNode)[][] = [];

	// Step 1: building DAG.
	/** Edges from the spanning DAG used to generate the layered tree */
	const DAGedges = discoverDAG(nodes);

	// Step 2: Layer assignment via simple topological sort
	{
		let edgeSort = [...DAGedges];
		let nodeSort = [...nodes];

		let i = 0;

		while (nodeSort.length > 0) {
			// All nodes with no incoming edges are in layer i
			layerNodes[i] = nodeSort.filter(
				node => edgeSort.filter(e => e.liftedTarget === node).length === 0,
			);
			layerNodes[i].forEach(n => {
				n.layer = i;
			});

			// If we filtered no nodes, we're going to get stuck.
			if (layerNodes[i].length === 0) {
				console.error({nodes, layerNodes, i, nodeSort, edgeSort});
				throw new Error('Invalid data in layering algorithm');
			}

			// Remove these nodes from the graph
			nodeSort = nodeSort.filter(n => !layerNodes[i].includes(n));

			// And remove the edges going to the nodes we just filtered out
			edgeSort = edgeSort.filter(
				e =>
					!(
						layerNodes[i].includes(e.liftedTarget as LayerTreeNode) ||
						layerNodes[i].includes(e.liftedSource as LayerTreeNode)
					),
			);

			// On to the next layer
			i++;
		}
	}

	// Step 3: Put nodes in the layer in a clear order.
	// First, give us a copy of the edgeData we can easily edit and extend. For this we only need the source and target.
	type SugEdge = {
		source: LayerTreeNode | DummyNode;
		target: LayerTreeNode | DummyNode;
		original: GraphDataEdge;
		inverted: boolean;
	};

	const sugEdges = [...allEdges].map((e): SugEdge => {
		const source = e.liftedSource as LayerTreeNode;
		const target = e.liftedTarget as LayerTreeNode;
		if (source.layer! < target.layer!) {
			return {source, target, original: e, inverted: false};
		} else {
			return {
				source: target,
				target: source,
				original: e,
				inverted: true,
			};
		}
	});

	// Step 3 part 1: Insert dummy nodes for edges spanning multiple layers
	for (let i = 0; i < sugEdges.length; i++) {
		const e = sugEdges[i];
		const distance = e.target.layer! - e.source.layer!;
		if (distance > 1) {
			// make dummy node
			const dummyNode: DummyNode = {
				layer: e.source.layer! + 1,
				height: 0,
				width: 0,
				isDummy: true,
			};
			layerNodes[e.source.layer! + 1].push(dummyNode);

			// Add new edge from dummy to target
			sugEdges.push({
				source: dummyNode,
				target: e.target,
				original: e.original,
				inverted: e.inverted,
			});

			// Change current edge to go to the dummy node
			e.target = dummyNode;
		}
	}

	// Step3 part 2: Sort the vertices using a heuristic.
	// The heuristic puts the nodes in each layer in the median position of their predecessors
	const amountOfIterations = 40;
	for (let j = 0; j < amountOfIterations; j++) {
		layerNodes.forEach((layer, i) => {
			const newLayer = layer
				.map(node => {
					const predecessorsRanks = sugEdges
						.filter(e => e.target === node)
						.map(e => layerNodes[i - 1]?.findIndex(x => x === e.source));
					const median = predecessorsRanks.sort((a, b) => a - b)[
						Math.floor(predecessorsRanks.length / 2)
					];
					return {median, node};
				})
				.sort((a, b) => a.median - b.median)
				.map(({node}) => node);

			layerNodes[i] = newLayer;
		});
	}

	// In between: let's remove consecutive dummy nodes, otherwise the result will look ugly
	layerNodes.forEach(layer => {
		for (let i = 0; i < layer.length; ) {
			const thisItem = layer[i];
			const nextItem = layer[i + 1] ?? {};
			if ('isDummy' in thisItem && 'isDummy' in nextItem) {
				nextItem.realDummy = thisItem;
				layer.splice(i + 1, 1);
			} else {
				i++;
			}
		}
	});

	// Step 4: Coordinate assignment
	// First, make sure everything has the same width and height
	const numColumns = Math.max(...layerNodes.map(l => l.length));

	layerNodes.forEach(layer => {
		const maxHeight = Math.max(...layer.map(l => l.height));
		layer.forEach(node => (node.height = maxHeight));
	});

	for (let i = 0; i < numColumns; i++) {
		const columnWidth = Math.max(...layerNodes.map(l => l[i]?.width ?? 0));
		layerNodes.forEach(layer => (layer[i] ? (layer[i].width = columnWidth) : undefined));
	}

	// Assign coordinates
	let currentHeight = 0;

	layerNodes.forEach(layer => {
		let currentWidth = 0;
		layer.forEach(node => {
			node.y = currentHeight + 0.5 * node.height;
			node.x = currentWidth + 0.5 * node.width;
			currentWidth += node.width + drawSettings.nodeMargin;
		});
		currentHeight += layer[0]?.height + drawSettings.nodeMargin;
	});

	// Finally: edge routing
	// We want to route edges through their dummy nodes.
	if (options?.edgeRouting) {
		sugEdges.forEach(e => {
			if ('isDummy' in e.target) {
				const target = e.target.realDummy ?? e.target;
				e.original.routing[e.inverted ? 'push' : 'unshift']({
					x: notNaN(target.x),
					y: notNaN(target.y),
					//@ts-ignore
					origin: parentNode,
				});
			}
		});
	}

	if (parentNode?.id === 'com.fsck.k9.K9$Intents') {
		console.log({coords: layerNodes.map(l => l.map(n => ({x: n.x, y: n.y})))});
	}
	if (parentNode) {
		const {width, height} = centerize(nodes, [...allEdges]);
		if (parentNode?.id === 'com.fsck.k9.K9$Intents') {
			console.log({coords: layerNodes.map(l => l.map(n => ({x: n.x, y: n.y})))});
		}

		parentNode.width = width + 2 * drawSettings.nodePadding;
		parentNode.height = height + 2 * drawSettings.nodePadding;
	}
};
/**
 * Searches for a spanning DAG in the given nodes. Returns the edges of said DAG.
 *
 * Should be optimized at some point.
 */
function discoverDAG(graphNodes: GraphDataNode[]) {
	type MarkedNode = GraphDataNode & {mark?: boolean};
	const nodes = graphNodes as MarkedNode[];
	const DAGedges: GraphDataEdge[] = [];

	// Start with all edges
	nodes.forEach(node => {
		node.outgoingLinksLifted.filter(filterEdges).forEach(e => {
			if (!DAGedges.includes(e)) {
				DAGedges.push(e);
			}
		});
	});

	/** Depth first search: remove node if we run into a cycle*/
	function dfs(node: MarkedNode, markedNodes: GraphDataNode[]) {
		DAGedges.filter(e => e.liftedSource === node).forEach(edge => {
			const target = edge.liftedTarget!;
			if (markedNodes.includes(target)) {
				const index = DAGedges.findIndex(e => e === edge);
				DAGedges.splice(index, 1);
			} else {
				if (!node.mark) dfs(target, [...markedNodes, target]);
			}
		});
		node.mark = true;
	}

	nodes.forEach(node => {
		if (!node.mark) {
			dfs(node, [node]);
		}
	});

	nodes.forEach(node => {
		delete node.mark;
	});

	return new Set(DAGedges);
}
