import {type LayoutNestingLevels, type LayoutOptions, type DrawSettingsInterface} from '$types';

export enum DotType {
	Flag,
	NestedCircles,
	OnlyRoot,
	OnlyIntermediate,
	OnlyLeaf,
	EdgePorts,
	NodeSize,
	NodePadding,
	NodeMarginRoot,
	NodeMarginIntermediate,
	NodeMarginLeaf,
	Forces,
}

export interface ServerDataType {
	evaluationResults: (number | string)[][];
	header: string[];
	jsonData: JsonDataType;
	oldData?: boolean;
}

export type JsonDataType = {
	[hash: string]: DrawSettingsInterface;
};

export type Identifier = {fileName: string; hash: string};

export type countLayoutType = {
	[level in LayoutNestingLevels]?: {[algo in LayoutOptions]?: number};
} & {
	edgePort: {
		true: number;
		false: number;
	};
};
