import {notNaN, partitionArray} from '$helper';
import {checkWidthHeight} from './helpers';
import type {NodeLayout} from './types';

/**
 * Circular layout
 *
 * Assumes all nodes already have a width and height assigned
 */

export const circularLayout: NodeLayout = function (drawSettings, childNodes, parentNode?) {
	if (!checkWidthHeight(childNodes)) {
		throw new Error('unreachable');
	}

	// Prepare nodes
	const sortedNodes = childNodes
		.map(n => n) // Prevent changing the original array to be sure
		// First put all nodes with lots of incoming links at the start
		.sort((n1, n2) => {
			if (n1.incomingLinksLifted.length === 0 || n2.outgoingLinksLifted.length === 0) {
				return 1;
			}
			if (n2.incomingLinksLifted.length === 0 || n1.outgoingLinksLifted.length === 0) {
				return -1;
			}
			const score1 = n1.outgoingLinksLifted.length - n1.incomingLinksLifted.length;
			const score2 = n2.outgoingLinksLifted.length - n2.incomingLinksLifted.length;
			return score1 - score2;
		});

	// For the algorithm, the array needs to contain the nodes in rendering order
	// Nodes are rendered, starting at the bottom; anti-clockwise
	const t = partitionArray(sortedNodes, (_, i) => i % 2 === 0);
	t[1].reverse();
	// This variable now has all nodes in the desired order
	const nodes = [...t[0], ...t[1]];

	// Set up some variables related to the circle.
	const circumference = nodes.reduce((acc, n) => {
		const thisNode = Math.sqrt(n.width ** 2 + n.height ** 2) + drawSettings.nodeMargin;
		return acc + thisNode;
	}, 0);

	const radius = circumference / (2 * Math.PI) + 20;
	let i = 0; // Keeps track of the angle we're currently at
	const deltaAngle = (2 * Math.PI) / circumference;

	// We want to keep track of this to give the correct dimensions to the parentnode in the end
	// (Not entirely layout-related)
	let maxX = 0.5 * notNaN(drawSettings.minimumNodeSize),
		maxY = 0.5 * notNaN(drawSettings.minimumNodeSize);

	// Assign coordinates to nodes
	nodes.forEach(n => {
		const hypotenuse = Math.sqrt(n.width ** 2 + n.height ** 2);
		i += 0.5 * (hypotenuse + drawSettings.nodeMargin);
		const angle = deltaAngle * i;
		i += 0.5 * (hypotenuse + drawSettings.nodeMargin);
		n.x = notNaN(Math.sin(angle) * radius);
		n.y = notNaN(Math.cos(angle) * radius);
		maxX = Math.max(maxX, Math.abs(n.x + 0.5 * n.width), Math.abs(n.x - 0.5 * n.width));
		maxY = Math.max(maxY, Math.abs(n.y + 0.5 * n.height), Math.abs(n.y - 0.5 * n.height));
	});

	if (parentNode) {
		parentNode.width = notNaN(2 * maxX + 2 * drawSettings.nodePadding);
		parentNode.height = notNaN(2 * maxY + 2 * drawSettings.nodePadding);
	}
};
