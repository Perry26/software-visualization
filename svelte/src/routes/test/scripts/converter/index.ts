export interface rawInputType {
	// (generated via https://transform.tools/json-to-typescript)
	elements: {
		nodes: RawNodeType[]
		edges: RawEdgeType[]
	}
}

interface RawNodeType {
	data: {
		id: string
		properties: {
			simpleName: string
			kind?: string
		}
		labels: string[]
	}
}

interface RawEdgeType {
	data: {
		id: string
		source: string
		target: string
		label: LinkType
		properties: {
			containmentType?: string
			weight: number
			specializationType?: string
		} 
	}
}

export interface ConvertedNode {
	id: string,
	members: ConvertedNode[],
	parentId?: string,
	level: number,
}

export interface NodesDictionaryType {
	[id: string] : ConvertedNode
}

export interface ConvertedEdge {
	id: string,
	source: string,
	target: string,
	type: LinkType,
}

enum LinkType {
	contains = "contains",
	constructs = "constructs",
	holds = "holds",
	calls = "calls",
	accepts = "accepts",
	specializes = "specializes" ,
	returns = "returns",
	accesses = "accesses",
}

export interface ConvertedData {
	nodes: ConvertedNode[]
	links: ConvertedEdge[]
	nodesDictionary: NodesDictionaryType
}

export function converter(rawData?: rawInputType) : ConvertedData {
	if (!rawData) {
		// For now, lets return some test data if no input is provided
		const returnValue: ConvertedData = {
			nodes: [
				{ id: 'node1', level: 1, members: [] },
				{ id: 'node2', level: 1, members: [] },
				{
					id: 'node3',
					level: 1,
					members: [
						{
							id: 'member1',
							level: 2,
							members: [
								{
									id: 'anak1',
									level: 3,
									members: []
								},
								{
									id: 'anak2',
									level: 3,
									members: []
								}
							]
						},
						{
							id: 'member2',
							level: 2,
							members: []
						},
						{
							id: 'member3',
							level: 2,
							members: []
						}
					]
				}
			],
			links: [
				{ id: "linka", source: 'node1', target: 'node2', type: LinkType.calls },
				{ id: "linkb", source: 'node2', target: 'node3', type: LinkType.calls },
				{ id: "linkc", source: 'member2', target: 'member1', type: LinkType.calls },
				{ id: "linkd", source: 'member2', target: 'node1', type: LinkType.calls }
			],
			nodesDictionary: {},
		};
		const recursiveFunction = (n: ConvertedNode) => {
			returnValue.nodesDictionary[n.id] = n;
			n.members.forEach(recursiveFunction);
		};
		returnValue.nodes.forEach(recursiveFunction);
		return returnValue;
	}

	// The actual parsing.
	const nodes: NodesDictionaryType = {};

	// Populate object, so we can create references later
	rawData.elements.nodes.forEach(({data}: RawNodeType) => {
		nodes[data.id] = {
			id: data.id,
			members: [],
			level: NaN,
		}
	});


	rawData.elements.nodes.forEach(({data})  => {
		// Get current node
		const node = nodes[data.id]!;

		// Now, assign its parent
		const path = data.id.split(".");
		const parent = path.slice(0,-1).join(".");
		node.parentId = parent // Not a reference so output is serializable

		// Add childeren to the parents members
		nodes[parent]?.members?.push(node);
	});

	// // Calculate node nesting levels
	const rootNodes = Object.values(nodes).filter((node) => !node.parentId);
	
	rootNodes.forEach(function calulateNestingLevels(node: ConvertedNode, level: number = 0) {
		node.level = level;
		node.members.forEach(n => calulateNestingLevels(n, level + 1));
	});

	const links: ConvertedEdge[] = rawData.elements.edges.map(({data}): ConvertedEdge => {
		return {
			id: data.id,
			source: data.source,
			target: data.target,
			type: data.label,
		};
	});

	return {
		nodes: Object.values(nodes),
		links: links,
		nodesDictionary: nodes,
	}
}