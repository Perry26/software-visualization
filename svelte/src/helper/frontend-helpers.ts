import type {LayoutNestingLevels} from '$types';

export function toScreenName(s: LayoutNestingLevels) {
	if (s === 'root') return 'Top';
	if (s === 'intermediate') return 'Middle';
	if (s === 'inner') return 'Leaf';
}
