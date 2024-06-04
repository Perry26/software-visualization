import {getNode} from '$helper/graphdata-helpers';
import type {GraphData, GraphDataEdge, GraphDataNode} from '$types';
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

function isAncestor(node: GraphDataNode, presumedParent: GraphDataNode) {
	if (node.id === presumedParent.id) {
		return true;
	} else if (node.parent) {
		return isAncestor(node.parent, presumedParent);
	} else {
		return false;
	}
}

/** Get the absolute x and y coordinates position of the given node */
function getAbsPosition(node: GraphDataNode): {x: number; y: number} {
	if (node.parent) {
		const {x, y} = getAbsPosition(node.parent);
		return {
			x: node.x! + x,
			y: node.y! + y,
		};
	} else {
		return {x: node.x ?? 0, y: node.y ?? 0};
	}
}

export class LayoutMetrics {
	data?: GraphData;

	setData(d: GraphData) {
		this.data = d;
	}

	/** Set the latest graphData rendered, so it is accessible from this file */
	run() {
		if (!this.data) {
			throw new Error('Data for evaluator not found');
		}

		// Prepare data
		// Line segments
		const segments = this.data.links.flatMap(l => {
			const res: {segment: Segment; edge: GraphDataEdge}[] = [];
			for (let i = 0; i < l.renderPoints!.length - 1; i++) {
				const p1 = new Point(l.renderPoints![i].x, l.renderPoints![i].y);
				const p2 = new Point(l.renderPoints![i + 1].x, l.renderPoints![i + 1].y);
				const segment = new Segment(p1, p2);
				res.push({segment, edge: l});
			}
			return res;
		});

		// Segment length
		const averageSegment =
			segments.reduce((acc, value) => acc + value.segment.length, 0) / segments.length;
		const averageSegmentDifference =
			segments
				.map(s => Math.abs(s.segment.length - averageSegment))
				.reduce((acc, value) => acc + value, 0) / segments.length;

		// Calculate intersections
		// Line segments
		let lineLineIntersectCount = 0;
		let fullLineOverlapping = 0; // Chances of this going up are extremely slim
		for (let i = 0; i < segments.length; i++) {
			for (let j = i + 1; j < segments.length; j++) {
				const intersect = segments[i].segment.intersect(segments[j].segment);
				if (intersect.length > 0) {
					lineLineIntersectCount++;
				}
				if (intersect.length > 1) {
					fullLineOverlapping++;
				}
			}
		}

		// Rectangle overlap
		let rectangleOverlappingCount = 0;
		function rec(nodes: GraphDataNode[]): {box: Box; node: GraphDataNode}[] {
			const boxes = nodes.map(node => {
				const {x, y} = getAbsPosition(node);
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
		let lineRectangleIntersectionCount = 0;
		segments.map(({segment, edge}) => {
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
		const minX = this.data.nodes.reduce(
			(acc, node) => Math.min(node.x! - 0.5 * node.width!, acc),
			Infinity,
		);
		const minY = this.data.nodes.reduce(
			(acc, node) => Math.min(node.y! - 0.5 * node.height!, acc),
			Infinity,
		);
		const maxX = this.data.nodes.reduce(
			(acc, node) => Math.min(node.x! + 0.5 * node.width!, acc),
			Infinity,
		);
		const maxY = this.data.nodes.reduce(
			(acc, node) => Math.min(node.y! + 0.5 * node.height!, acc),
			Infinity,
		);

		const area = Math.abs(maxX - minX) * Math.abs(maxY - minY);

		const aspectRatio = Math.abs(maxX - minX) / Math.abs(maxY - minY);

		// Orthogonality metrics
		// TODO nodes must be unrelated
		let orthogonalNodeCount = 0;
		for (let i = 0; i < boxes.length; i++) {
			for (let j = i + 1; j < boxes.length; j++) {
				const [box1, box2] = [boxes[i].box, boxes[j].box];
				if (box1.center.x === box2.center.x) {
					console.log({box1, box2});
					orthogonalNodeCount++;
				}
				if (box1.center.y === box2.center.y) {
					orthogonalNodeCount++;
				}
			}
		}

		// Prepare output
		const arr: [string, number][] = [
			['Node overlaps', rectangleOverlappingCount],
			['Node orthogonality', orthogonalNodeCount],
			['Total area', area],
			['Aspect ratio', aspectRatio],
			['Line intersections', lineLineIntersectCount],
			['Full line overlaps', fullLineOverlapping],
			['Avg. length difference', averageSegmentDifference],
			['Lines overlapping unrelated nodes', lineRectangleIntersectionCount],
		];

		const copyString = arr.reduce((acc, [label, count]) => {
			console.log({acc});
			return acc + label + '\t' + count + '\n';
		}, '');

		const tableString = arr.reduce((acc, [label, count]) => {
			return acc + '<tr><td>' + label + '</td><td>' + count + '</td></tr>';
		}, '');

		// Return results
		return {copyString, tableString};
	}
}
