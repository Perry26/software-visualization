import type {OmitStrict} from '$scripts/draw/helper/types';
import type {DrawSettingsInterface, GraphDataNode} from '$types';

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
	uniformSize: boolean;
	/** Currently dead code, reïntroduce? */
	edgeRouting?: boolean;
}
