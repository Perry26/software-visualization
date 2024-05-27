import * as d3 from 'd3';
import type {GraphDataEdge, GraphDataNode} from '$types';
import {notNaN} from '$helper';
import {checkWidthHeight, filterEdges} from './helpers';
import type {NodeLayout} from './types';

export const forceBasedLayout: NodeLayout = function (drawSettings, childNodes, parentNode) {
	checkWidthHeight(childNodes);

	// collect relevant edges
	const allLinks = new Set<GraphDataEdge>();
	childNodes.forEach(node => node.incomingLinksLifted.forEach(node => allLinks.add(node)));
	const copyLinks = [...allLinks].filter(filterEdges).map(l => {
		return {
			source: l.liftedSource!,
			target: l.liftedTarget!,
		};
	});

	// Make and run simulation
	const simulation = d3.forceSimulation<GraphDataNode>(childNodes);
	simulation.force(
		'charge',
		d3.forceManyBody().strength(d => {
			return (d as GraphDataNode).width! + (d as GraphDataNode).height! * -75;
		}),
	);
	simulation.force('x', d3.forceX(0));
	simulation.force('y', d3.forceY(0));
	simulation.force(
		'link',
		d3.forceLink(copyLinks).id(n => (n as GraphDataNode).id),
	);
	simulation.tick(300);
	simulation.stop();

	// set parent dimensions
	if (parentNode) {
		const width =
			2 *
			(Math.max(
				0.5 * drawSettings.minimumNodeSize,
				...childNodes.map(node => Math.abs(node.x!) + 0.5 * node.width!),
			) +
				drawSettings.nodePadding);
		const height =
			2 *
			(Math.max(
				0.5 * drawSettings.minimumNodeSize,
				...childNodes.map(node => Math.abs(node.y!) + 0.5 * node.height!),
			) +
				drawSettings.nodePadding);
		parentNode.width = notNaN(width) + 2 * drawSettings.nodePadding;
		parentNode.height = notNaN(height) + 2 * drawSettings.nodePadding;
	}
};
