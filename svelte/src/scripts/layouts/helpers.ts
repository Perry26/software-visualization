import {
	EdgeType,
	type DrawSettingsInterface,
	type GraphDataEdge,
	type GraphDataNode,
	type LayoutNestingLevels,
} from '$types';
import type {LayoutDrawSettingsInterface, GraphDataNodeExt} from './types.ts';

export function getDrawSettingsForLayout(
	settings: DrawSettingsInterface,
	layoutType: LayoutNestingLevels,
): LayoutDrawSettingsInterface {
	return {...settings, nodeMargin: settings.nodeMargin[layoutType]};
}

export const filterEdges = (l: GraphDataEdge) => {
	return l.type === EdgeType.constructs || l.type === EdgeType.holds;
};
/**
 * Helper function for layouts
 *
 * Throws an error if any nodes in the given array is not yet drawn.
 * Returns the same object but with different type.
 */

export function checkWidthHeight(nodes: GraphDataNode[]): GraphDataNodeExt[] {
	nodes.forEach(n => {
		if (!n.width || !n.height) {
			console.log({node: n});
			throw new TypeError(
				`Unexpected value: node ${n.id} has no dimensions ${n.width}, ${n.height}`,
			);
		}
		if (
			!Number.isFinite(n.width) ||
			!Number.isFinite(n.height) ||
			Number.isNaN(n.width) ||
			Number.isNaN(n.height)
		) {
			console.log({node: n});
			throw new TypeError(
				`Unexpected value: node ${n.id} has NaN/infinite dimensions ${n.width}, ${n.height}`,
			);
		}
	});

	//@ts-expect-error Values can now not be undefined
	return nodes;
}
/** Helper function for layout algorithms
 * Given a list of nodes, reposition them such that the nodes are centered around the point 0,0.
 *
 * Necessary to make sure the node "fits" its parent. Returns the required height and width
 */

export function centerize(nodes: GraphDataNode[], edges?: GraphDataEdge[]) {
	const minX = nodes.reduce((acc, n) => Math.min(acc, n.x! - 0.5 * n.width!), Infinity);
	const minY = nodes.reduce((acc, n) => Math.min(acc, n.y! - 0.5 * n.height!), Infinity);
	const maxX = nodes.reduce((acc, n) => Math.max(acc, n.x! + 0.5 * n.width!), -Infinity);
	const maxY = nodes.reduce((acc, n) => Math.max(acc, n.y! + 0.5 * n.height!), -Infinity);

	const centerX = (maxX + minX) / 2;
	const centerY = (maxY + minY) / 2;

	nodes.forEach(n => {
		n.x! -= centerX;
		n.y! -= centerY;
	});

	if (edges) {
		edges.forEach(e => {
			e.routing.forEach(point => {
				point.x -= centerX;
				point.y -= centerY;
			});
		});
	}

	return {
		width: 2 * centerX,
		height: 2 * centerY,
	};
}
