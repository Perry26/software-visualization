import type {DrawSettingsInterface, GraphDataNode} from '$types';

export type GraphDataNodeExt = GraphDataNode & {width: number; height: number};
export type TreeNode = GraphDataNodeExt & {next: TreeNode[]};
export type NodeLayout = (
	drawSettings: LayoutDrawSettingsInterface,
	childNodes: GraphDataNode[],
	parentNode?: GraphDataNode,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	options?: any,
) => void;

export interface LayoutDrawSettingsInterface extends Omit<DrawSettingsInterface, 'nodeMargin'> {
	nodeMargin: number;
}
