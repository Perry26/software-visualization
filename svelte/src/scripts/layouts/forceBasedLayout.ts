import * as d3 from 'd3';
import type {GraphDataEdge} from '$types';
import {centerize, checkWidthHeight, filterEdges} from './helpers';
import type {GraphDataNodeExt, NodeLayout} from './types';
import {Box} from '@flatten-js/core';

type forceLink = {
	source: GraphDataNodeExt;
	target: GraphDataNodeExt;
};

function hasXY<T>(n: T): n is T & {x: number; y: number} {
	//@ts-ignore
	return !isNaN(n.x) && !isNaN(n.y);
}

/** Rectangle collision mechanism
 * (not actually a force, it just snaps nodes out of eachother to guarantee no overlap)
 */
function rectangleCollideForce(): d3.Force<GraphDataNodeExt, undefined> {
	let nodes: GraphDataNodeExt[];

	function force(_alpha: number) {
		for (let i = 0; i < nodes.length; i++) {
			for (let j = i + 1; j < nodes.length; j++) {
				const n1 = nodes[i];
				const n2 = nodes[j];

				if (hasXY(n1) && hasXY(n2)) {
					const box1 = new Box(
						n1.x - 0.5 * n1.width,
						n1.y - 0.5 * n1.height,
						n1.x + 0.5 * n1.width,
						n1.y + 0.5 * n1.height,
					);
					const box2 = new Box(
						n2.x - 0.5 * n2.width,
						n2.y - 0.5 * n2.height,
						n2.x + 0.5 * n2.width,
						n2.y + 0.5 * n2.height,
					);

					const isColliding = box1.intersect(box2);
					if (isColliding) {
						if (n1.x < n2.x) {
							n1.x -= 0.5 * n1.width + 0.5 * n2.width;
						} else {
							n1.x += 0.5 * n1.width + 0.5 * n2.width;
						}
						if (n1.y < n2.y) {
							n1.y -= 0.5 * n1.height + 0.5 * n2.height;
						} else {
							n1.y += 0.5 * n1.height + 0.5 * n2.height;
						}
					}
				}
			}
		}
	}

	force.initialize = function (_nodes: GraphDataNodeExt[]) {
		nodes = _nodes;
	};

	return force;
}

export const forceBasedLayout: NodeLayout = function (drawSettings, childNodes, parentNode) {
	const nodes = checkWidthHeight(childNodes);

	// collect relevant edges
	const allLinks = new Set<GraphDataEdge>();
	nodes.forEach(node => node.incomingLinksLifted.forEach(node => allLinks.add(node)));
	const copyLinks: forceLink[] = [...allLinks].filter(filterEdges).map(l => {
		return {
			source: l.liftedSource as GraphDataNodeExt,
			target: l.liftedTarget as GraphDataNodeExt,
		};
	});

	// Make and run simulation
	const simulation = d3.forceSimulation<GraphDataNodeExt, forceLink>(nodes);
	simulation.force(
		'charge',
		d3.forceManyBody<GraphDataNodeExt>().strength(d => {
			return d.width! + d.height! * -30;
		}),
	);
	simulation.force('collide', rectangleCollideForce());
	simulation.force('x', d3.forceX(0));
	simulation.force('y', d3.forceY(0));
	simulation.force(
		'link',
		d3
			.forceLink<GraphDataNodeExt, forceLink>(copyLinks)
			.id(n => n.id)
			.distance(
				({source, target}) =>
					30 +
					Math.sqrt(source.width * source.width + source.height * source.height) +
					Math.sqrt(target.width * target.width + target.height * target.height),
			),
	);
	simulation.tick(300);
	simulation.stop();

	// set parent dimensions
	const {width, height} = centerize(nodes);
	if (parentNode) {
		parentNode.width = width + 2 * drawSettings.nodePadding;
		parentNode.height = height + 2 * drawSettings.nodePadding;
	} else {
		nodes.forEach(n => {
			n.x! += 0.5 * width;
			n.y! += 0.5 * height;
		});
	}
};
