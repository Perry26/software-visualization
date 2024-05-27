import type {GraphDataNode} from '$types';
import {checkWidthHeight, filterEdges, centerize} from './helpers';
import type {TreeNode, NodeLayout} from './types';

function discoverTree(graphNodes: GraphDataNode[]) {
	// Initialize the nodes, and augment their datatype
	// The next property holds the next nodes in tree-structure
	const nodes = checkWidthHeight(graphNodes) as TreeNode[];
	nodes.forEach(n => (n.next = []));

	// Function (and type) to find the next root node (via reduce)
	type NextRootNodeAccType = {node: TreeNode; score: number} | undefined;
	const nextRootNode = (acc: NextRootNodeAccType, node: TreeNode) => {
		const incoming = node.incomingLinksLifted.filter(filterEdges);
		const outgoing = node.outgoingLinks.filter(filterEdges);
		const score = incoming.length - outgoing.length;
		if (score < (acc?.score ?? Infinity)) {
			return {node: node, score: score};
		} else {
			return acc;
		}
	};

	// Pick root at random (preferably the least amount of incoming nodes)
	const rootNode: TreeNode = nodes.reduce(nextRootNode, undefined as NextRootNodeAccType)!.node;

	// Discover tree structure by breadth-first-search
	// https://en.wikipedia.org/wiki/Edmonds%27_algorithm
	const toExplore = [rootNode];
	while (toExplore.length != nodes.length) {
		for (let i = 0; i < toExplore.length; i++) {
			toExplore[i].outgoingLinksLifted.filter(filterEdges).forEach(edge => {
				const target = edge.liftedTarget! as TreeNode;
				if (!toExplore.includes(target)) {
					toExplore.push(target);
					toExplore[i].next.push(target);
				}
			});
		}

		if (toExplore.length != nodes.length) {
			// Lets just say the disjointed part is a random leaf.
			const randomNode = nodes
				.filter(n => !toExplore.includes(n))
				.reduce(nextRootNode, undefined as NextRootNodeAccType)!.node;
			const lastNode = toExplore[toExplore.length - 1]!;
			lastNode.next.push(randomNode);
			toExplore.push(randomNode);
		}
	}

	if (toExplore.length !== nodes.length) {
		throw new Error('Unexplored nodes', {cause: nodes.filter(n => !toExplore.includes(n))});
	}

	return {nodes, rootNode};
}
function cleanupTree(nodes: TreeNode[]) {
	//Finally, cleanup and remove excess property
	nodes.forEach(n => {
		//@ts-expect-error Cleanup
		delete n.next;
	});
}
/**
 * Planar, straight line orthogonal tree drawing
 * ([Crescenzi Di Battista Piperno 92] [Shiloach 76])
 *
 * Designed for binary trees, but there is no reason at all this should not generalize if we accept edge crossings
 * (which is unavoidable anyway)
 */

export const straightTreeLayout: NodeLayout = function (
	drawSettings,
	childNodes,
	parentNode?,
	options?,
) {
	if (childNodes.length === 0) {
		return;
	}

	const {nodes, rootNode} = discoverTree(childNodes);

	// Make all nodes the same size (as intended for the algorithm)
	if (!options?.uniformSize) {
		const width = Math.max(...nodes.map(n => n.width), drawSettings.minimumNodeSize);
		const height = Math.max(...nodes.map(n => n.height), drawSettings.minimumNodeSize);
		nodes.forEach(n => {
			n.width = width;
			n.height = height;
		});
	}

	// Make sure all nodes have their top left coordinate at the same spot, namely the center of the parentnode
	nodes.forEach(n => {
		n.x = 0.5 * n.width + drawSettings.nodeMargin;
		n.y = 0.5 * n.height + drawSettings.nodeMargin;
	});

	/** Actually layout the nodes, recursively */
	function layoutRec(node: TreeNode): {
		width: number;
		height: number;
		nodes: TreeNode[];
	} {
		// Base case: we have a singular node.
		if (node.next.length === 0) {
			return {
				width: node.width,
				height: node.height,
				nodes: [node],
			};
		}

		// Recurse: calculate a sub-layout for all successors in the tree-structure
		const layouts = node.next.map(n => layoutRec(n)!);

		// Sort all layouts by size, increasing
		layouts.sort((a, b) => a.width * a.height - b.width * b.height);

		let verticalLayout = layouts[0];
		let horizontalLayout = layouts.slice(1);
		if (horizontalLayout.length === 0) {
			horizontalLayout = [verticalLayout];
			verticalLayout = {
				width: 0,
				height: 0,
				nodes: [],
			};
		}

		// Layout 0 (the smallest layout) should go to the bottom
		let currentHeight = node.height + drawSettings.nodeMargin;
		verticalLayout.nodes.forEach(n => {
			n.y! += currentHeight;
		});
		currentHeight += verticalLayout.height;

		// Layouts 1-n should go to the right
		let currentWidth = Math.max(verticalLayout.width, node.width) + drawSettings.nodeMargin;
		horizontalLayout.reverse().forEach(layout => {
			layout.nodes.forEach(n => {
				n.x = (n.x ?? 0) + currentWidth;
			});
			currentWidth += layout.width;
		});

		return {
			width: currentWidth,
			height: Math.max(currentHeight, ...layouts.map(l => l.height)),
			nodes: [node, ...layouts.flatMap(l => l.nodes)],
		};
	}

	const finalLayout = layoutRec(rootNode);

	if (parentNode) {
		const {width, height} = centerize(nodes);

		parentNode.width = width + 2 * drawSettings.nodePadding;
		parentNode.height = height + 2 * drawSettings.nodePadding;
	}

	cleanupTree(nodes);
};
