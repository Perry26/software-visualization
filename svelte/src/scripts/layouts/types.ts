import type {OmitStrict} from '$scripts/draw/helper/types';
import type {DrawSettingsInterface, GraphDataNode, ManyBodyForceOptions} from '$types';

export type GraphDataNodeExt = GraphDataNode & {width: number; height: number};
export type TreeNode = GraphDataNodeExt & {next: TreeNode[]};
export type NodeLayout = (
	drawSettings: LayoutDrawSettingsInterface,
	childNodes: GraphDataNode[],
	parentNode?: GraphDataNode,
) => void;

export interface LayoutDrawSettingsInterface
	extends OmitStrict<DrawSettingsInterface, 'nodeMargin' | 'layoutSettings'> {
	nodeMargin: number;
	layoutSettings: LayoutSettingsType;
}

export interface LayoutSettingsType {
	// For the layer- and straigth- tree algorithms
	uniformSize: boolean;

	// For the force-based algorithms
	manyBodyForce: {
		type: ManyBodyForceOptions;
		strength: number;
	};
	collideRectangles: boolean;
	centerForceStrength: {
		enabled: boolean;
		x: number;
		y: number;
	};
	linkForce: {
		enabled: boolean;
		distance: number;
		strength: number;
	};

	/** Currently dead code, reïntroduce? */
	edgeRouting?: boolean;
}
