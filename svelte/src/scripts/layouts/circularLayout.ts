import {notNaN} from '$helper';
import {checkWidthHeight} from './helpers';
import type {NodeLayout} from './types';

/**
 * Circular layout
 *
 * Assumes all nodes already have a width and height assigned
 */

export const circularLayout: NodeLayout = function (drawSettings, childNodes, parentNode?) {
	const nodes = checkWidthHeight(childNodes);

	const circumference = nodes.reduce((acc, n) => {
		const thisNode = Math.sqrt(n.width ** 2 + n.height ** 2) + drawSettings.nodeMargin;
		return acc + thisNode;
	}, 0);

	const radius = circumference / (2 * Math.PI) + 20;

	let maxX = 0.5 * notNaN(drawSettings.minimumNodeSize),
		maxY = 0.5 * notNaN(drawSettings.minimumNodeSize);

	//
	//const totalNodesRec = nodes.reduce((acc, n) => acc + n.members.length + 1, 0);
	let i = 0;
	const deltaAngle = (2 * Math.PI) / circumference;

	// Assign actual coordinates
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
