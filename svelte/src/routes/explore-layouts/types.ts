import {type DrawSettingsInterface} from '$types';

export enum DotType {
	Flag,
	NestedCircles,
	OnlyRoot,
	OnlyIntermediate,
	OnlyLeaf,
}

export interface ServerDataType {
	evaluationResults: (number | string)[][];
	header: string[];
	jsonData: JsonDataType;
}

export type JsonDataType = {
	[hash: string]: DrawSettingsInterface;
};
