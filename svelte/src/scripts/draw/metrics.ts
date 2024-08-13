import {getAbsCoordinates, getNode} from '$helper/graphdata-helpers';
import {
	type EdgeRoutingOrigin,
	EdgeType,
	type GraphData,
	type GraphDataEdge,
	type GraphDataNode,
} from '$types';
import {
	Point,
	Vector,
	Circle,
	Line,
	Ray,
	Segment,
	Arc,
	Box,
	Polygon,
	Matrix,
	PlanarSet,
} from '@flatten-js/core';
import {deviation} from 'd3';

function isAncestor(node: GraphDataNode, presumedParent: GraphDataNode) {
	if (node.id === presumedParent.id) {
		return true;
	} else if (node.parent) {
		return isAncestor(node.parent, presumedParent);
	} else {
		return false;
	}
}

function segmentsAreContiguous(s1: Segment, s2: Segment): boolean {
	return (
		s1.start.equalTo(s2.start) ||
		s1.start.equalTo(s2.end) ||
		s1.end.equalTo(s2.start) ||
		s1.end.equalTo(s2.end)
	);
}

/** Calculates the angle between 2 intersecting line segments */
function lineAngle(a: Segment, b: Segment) {
	const dAx = a.end.x - a.start.x;
	const dAy = a.end.y - a.start.y;
	const dBx = b.end.x - b.start.x;
	const dBy = b.end.y - b.start.y;
	const angle = Math.atan2(dAx * dBy - dAy * dBx, dAx * dBx + dAy * dBy);

	const resultInDegrees = angle * (180 / Math.PI);
	return resultInDegrees;
}

export class LayoutMetrics {
	private data?: GraphData;

	setData(d: GraphData) {
		this.data = d;
	}

	/** Set the latest graphData rendered, so it is accessible from this file */
	run() {
		if (!this.data) {
			throw new Error('Data for evaluator not found');
		}
		console.log({
			edges: this.data.links.filter(l => l.type === EdgeType.calls).length,
			nodes: Object.keys(this.data.nodesDict).length,
		});

		// Prepare data
		// Line segments
		const segments: Segment[] = [];
		const usedPairs: Set<[EdgeRoutingOrigin, EdgeRoutingOrigin]> = new Set();
		this.data.links
			.filter(l => l.type === EdgeType.calls)
			.forEach(l => {
				for (let i = 0; i < l.renderPoints!.length - 1; i++) {
					const source = l.renderPoints![i].origin!;
					const target = l.renderPoints![i + 1].origin!;
					if (!usedPairs.has([source, target])) {
						usedPairs.add([source, target]);

						const s = getAbsCoordinates(source as never);
						const t = getAbsCoordinates(target as never);
						segments.push(new Segment(new Point(s.x, s.y), new Point(t.x, t.y)));
					}
				}
			});

		// Segment length
		const averageSegment = segments.reduce((acc, value) => acc + value.length, 0) / segments.length;
		const averageSegmentDifference =
			segments
				.map(s => Math.abs(s.length - averageSegment))
				.reduce((acc, value) => acc + value, 0) / segments.length;

		// Calculate intersections
		// Line segments
		let lineLineIntersectCount = 0;
		let totalLineAngle = 0;
		for (let i = 0; i < segments.length; i++) {
			for (let j = i + 1; j < segments.length; j++) {
				if (!segmentsAreContiguous(segments[i], segments[j])) {
					const intersect = segments[i].intersect(segments[j]);
					if (intersect.length > 0) {
						lineLineIntersectCount++;
						totalLineAngle += Math.abs(lineAngle(segments[i], segments[j]));
					}
				}
			}
		}
		totalLineAngle /= lineLineIntersectCount;

		// Rectangle overlap
		let rectangleOverlappingCount = 0;
		function rec(nodes: GraphDataNode[]): {box: Box; node: GraphDataNode}[] {
			const boxes = nodes.map(node => {
				const {x, y} = getAbsCoordinates(node as never);
				const box = new Box(
					x - 0.5 * node.width!,
					y - 0.5 * node.height!,
					x + 0.5 * node.width!,
					y + 0.5 * node.height!,
				);
				return {box, node};
			});

			for (let i = 0; i < boxes.length; i++) {
				for (let j = i + 1; j < boxes.length; j++) {
					const intersect = boxes[i].box.intersect(boxes[j].box);
					if (intersect) {
						rectangleOverlappingCount++;
					}
				}
			}

			return [...boxes, ...nodes.flatMap(n => rec(n.members))];
		}

		const boxes = rec(this.data.nodes);

		// Lines overlapping with unrelated node
		const segmentsExt = this.data.links
			.filter(l => l.type === EdgeType.calls)
			.flatMap(l => {
				const res: {segment: Segment; edge: GraphDataEdge}[] = [];
				for (let i = 0; i < l.renderPoints!.length - 1; i++) {
					const p1 = new Point(l.renderPoints![i].x, l.renderPoints![i].y);
					const p2 = new Point(l.renderPoints![i + 1].x, l.renderPoints![i + 1].y);
					const segment = new Segment(p1, p2);
					res.push({segment, edge: l});
				}
				return res;
			});

		let lineRectangleIntersectionCount = 0;
		segmentsExt.map(({segment, edge}) => {
			boxes.forEach(({box, node}) => {
				const source = getNode(edge.source, this.data!.nodesDict);
				const target = getNode(edge.target, this.data!.nodesDict);
				if (!(isAncestor(source, node) || isAncestor(target, node))) {
					const intersections = segment.intersect(box);
					if (intersections.length > 0) {
						lineRectangleIntersectionCount++;
					}
				}
			});
		});

		// Area metrics:
		const {maxX, minX, maxY, minY} = this.getBoundaries();
		const area = Math.abs(maxX - minX) * Math.abs(maxY - minY);
		const aspectRatio = Math.abs(maxX - minX) / Math.abs(maxY - minY);

		// Orthogonality metrics
		let orthogonalNodeCount = 0;
		for (let i = 0; i < boxes.length; i++) {
			for (let j = i + 1; j < boxes.length; j++) {
				const [box1, box2] = [boxes[i].box, boxes[j].box];
				const [node1, node2] = [boxes[i].node, boxes[j].node];
				if (!(isAncestor(node1, node2) || isAncestor(node2, node1))) {
					if (box1.center.x === box2.center.x) {
						orthogonalNodeCount++;
					}
					if (box1.center.y === box2.center.y) {
						orthogonalNodeCount++;
					}
				}
			}
		}

		// Node density (Huang 2020)
		const nodeDensityFn = (nodes: GraphDataNode[]): {std: number; weight: number}[] => {
			if (nodes.length < 3) {
				return [];
			}
			const {maxX, minX, maxY, minY} = this.getBoundaries(nodes);
			const stepSizeX = (maxX - minX) / Math.ceil(Math.sqrt(nodes.length));
			const stepSizeY = (maxY - minY) / Math.ceil(Math.sqrt(nodes.length));

			const containers: number[] = [];
			for (let x = minX; x < maxX; x += stepSizeX) {
				for (let y = minY; y < maxY; y += stepSizeY) {
					let hits = 0;
					nodes.forEach(n => {
						if (x <= n.x! && n.x! < x + stepSizeX && y <= n.y! && n.y! < y + stepSizeY) {
							hits++;
						}
					});
					containers.push(hits);
				}
			}

			return [
				{std: deviation(containers) ?? NaN, weight: (maxX - minX) * (maxY - minY)},
				...nodes.flatMap(n => nodeDensityFn(n.members)),
			];
		};
		const res = nodeDensityFn(this.data.nodes);
		const totalWeight = res.reduce((acc, {weight}) => acc + weight, 0);
		const nodeDensity = res.reduce((acc, {std, weight}) => acc + std * weight, 0) / totalWeight;

		// Prepare output
		const arr: [string, number][] = [
			['Node overlaps', rectangleOverlappingCount],
			['Node orthogonality', orthogonalNodeCount],
			['Avg node density std', nodeDensity],
			['Total area', area],
			['Aspect ratio', aspectRatio],
			['(Unrelated) Line intersections', lineLineIntersectCount],
			['Avg. length difference', averageSegmentDifference],
			['Avg. radial distance on intersections', totalLineAngle],
			['Lines overlapping unrelated nodes', lineRectangleIntersectionCount],
		];

		const copyString = arr.reduce((acc, [label, count]) => {
			return acc + label + '\t' + count + '\n';
		}, '');

		const tableString = arr.reduce((acc, [label, count]) => {
			return acc + '<tr><td>' + label + '</td><td>' + count + '</td></tr>';
		}, '');

		// Return results
		return {copyString, tableString, evaluationData: arr};
	}

	getBoundaries(nodes?: GraphDataNode[]) {
		if (!this.data) {
			throw new Error('Data for evaluator not found');
		}
		if (!nodes) {
			nodes = this.data.nodes;
		}

		const minX = nodes.reduce((acc, node) => Math.min(node.x! - 0.5 * node.width!, acc), Infinity);
		const minY = nodes.reduce((acc, node) => Math.min(node.y! - 0.5 * node.height!, acc), Infinity);
		const maxX = nodes.reduce((acc, node) => Math.max(node.x! + 0.5 * node.width!, acc), -Infinity);
		const maxY = nodes.reduce(
			(acc, node) => Math.max(node.y! + 0.5 * node.height!, acc),
			-Infinity,
		);
		return {maxX, minX, maxY, minY};
	}
}
