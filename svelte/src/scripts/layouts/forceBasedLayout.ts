import * as d3 from 'd3';
import type {GraphDataEdge} from '$types';
import {centerize, checkWidthHeight, filterEdges} from './helpers';
import type {GraphDataNodeExt, NodeLayout} from './types';
import {Box, Polygon} from '@flatten-js/core';

type forceLink = {
	source: GraphDataNodeExt;
	target: GraphDataNodeExt;
};

// Helper functions for typing
function hasXY<T>(n: T): n is T & {x: number; y: number} {
	//@ts-ignore
	return !isNaN(n.x) && !isNaN(n.y);
}

function hasVxVy<T>(n: T): n is T & {vx: number; vy: number} {
	//@ts-ignore
	return !isNaN(n.vx) && !isNaN(n.vy);
}

/** Rectangle collision mechanism
 * (not actually a force, it just snaps nodes out of each-other to guarantee no overlap)
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

function rectangleManyBodyForce(): d3.ForceManyBody<GraphDataNodeExt> {
	let nodes: GraphDataNodeExt[];
	let strength = function (_: GraphDataNodeExt) {
		return -30;
	};
	let distanceMin = 1;
	let distanceMax = Infinity;

	function force(_alpha: number) {
		for (let i = 0; i < nodes.length; i++) {
			for (let j = i + 1; j < nodes.length; j++) {
				const n1 = nodes[i];
				const n2 = nodes[j];

				if (hasXY(n1) && hasXY(n2) && hasVxVy(n1) && hasVxVy(n2)) {
					// Set up flatten-js to get the distance between 2 squares
					const polygon1 = new Polygon(
						new Box(
							n1.x - 0.5 * n1.width,
							n1.y - 0.5 * n1.height,
							n1.x + 0.5 * n1.width,
							n1.y + 0.5 * n1.height,
						),
					);
					const polygon2 = new Polygon(
						new Box(
							n2.x - 0.5 * n2.width,
							n2.y - 0.5 * n2.height,
							n2.x + 0.5 * n2.width,
							n2.y + 0.5 * n2.height,
						),
					);
					const [distance, distanceSegment] = polygon1.distanceTo(polygon2);

					if (distanceMin < distance && distance < distanceMax) {
						// Below variables contain unit-vectors
						const tangent2 = distanceSegment.tangentInStart();
						const tangent1 = distanceSegment.tangentInEnd();

						// Finally, modify the velocity of the nodes
						const distanceInv = 1 / distance;
						const strength1 = strength(n1) * distanceInv;
						const strength2 = strength(n2) * distanceInv;
						n1.vx += tangent1.x * strength1;
						n1.vy += tangent1.y * strength1;
						n2.vx += tangent2.x * strength2;
						n2.vy += tangent2.y * strength2;
					}
				}
			}
		}
	}

	force.initialize = function (_nodes: GraphDataNodeExt[]) {
		nodes = _nodes;
	};

	force.strength = function (func: (d: GraphDataNodeExt) => number) {
		strength = func;
	};

	force.distanceMin = function (n: number) {
		distanceMin = n;
	};

	force.distanceMax = function (n: number) {
		distanceMax = n;
	};

	force.theta = function (_n: number) {};

	//@ts-ignore
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

	drawSettings.layoutSettings.manyBodyForce.type !== 'None' &&
		simulation.force(
			'charge',
			(drawSettings.layoutSettings.manyBodyForce.type === 'Charge'
				? d3.forceManyBody<GraphDataNodeExt>()
				: drawSettings.layoutSettings.manyBodyForce.type === 'Rectangular'
				? rectangleManyBodyForce()
				: undefined)!.strength(d => {
				return d.width! + d.height! * -drawSettings.layoutSettings.manyBodyForce.strength;
			}),
		);
	drawSettings.layoutSettings.collideRectangles &&
		simulation.force('collide', rectangleCollideForce());

	drawSettings.layoutSettings.centerForceStrength.enabled &&
		simulation.force('x', d3.forceX(0).strength(drawSettings.layoutSettings.centerForceStrength.x));
	drawSettings.layoutSettings.centerForceStrength.enabled &&
		simulation.force('y', d3.forceY(0).strength(drawSettings.layoutSettings.centerForceStrength.y));
	drawSettings.layoutSettings.linkForce.enabled &&
		simulation.force(
			'link',
			d3
				.forceLink<GraphDataNodeExt, forceLink>(copyLinks)
				.id(n => n.id)
				.distance(
					({source, target}) =>
						drawSettings.layoutSettings.linkForce.distance +
						Math.sqrt(source.width * source.width + source.height * source.height) +
						Math.sqrt(target.width * target.width + target.height * target.height),
				)
				.strength(drawSettings.layoutSettings.linkForce.strength),
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
