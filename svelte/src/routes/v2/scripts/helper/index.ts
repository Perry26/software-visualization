import type { EdgeType, GraphDataEdge } from '../../types';

export function flattenNode(nodes: any) {
	//   reserse the order so that the parent is always at the end.
	const result: any[] = [];
	nodes.forEach((node: any) => {
		// order matter.
		if (node.members) {
			result.push(...flattenNode(node.members));
		}
		result.push(node);
	});
	return result;
}

export function extractAvailableEdgeType(links: GraphDataEdge[]) {
	const availableEdgeType: EdgeType[] = [];
	links.forEach((link) => {
		if (!availableEdgeType.includes(link.type)) availableEdgeType.push(link.type);
	});
	return availableEdgeType;
}

// Currently, this function combine the weights with undeleted duplicated links in mind
export function combineWeights(duplicateLinks: Map<string, GraphDataEdge[]>) {
	for (const [_, edges] of duplicateLinks) {
		let totalWeight = 0;
		edges.forEach((edge) => {
			if (!edge.originalWeight) edge.originalWeight = edge.weight;
			totalWeight += edge.originalWeight;
		});
		// Reassign the weight
		edges.forEach((edge) => {
			edge.weight = totalWeight;
		});
	}
}
