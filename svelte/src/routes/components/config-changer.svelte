<script lang="ts">
	import Heading from '$ui/heading.svelte';
	import Toggle from '$ui/toggle.svelte';
	import type {ConfigInterface, GraphDataNode} from '$types';

	export let config: ConfigInterface;
	export let doRefilter: boolean;
	export let flattenNodes: GraphDataNode[];

	let dependencyLiftTolerance: string;
	let liftAll: boolean = false;
	let hideHierarchicalEdges: boolean = false;
</script>

<div>
	<Heading class="mt-2">Config Changer</Heading>
	<div>
		to collapse node, you can click on the red button <br />
		<Heading class="mt-3">Edge aggregation</Heading>
		To lift edges, click the blue button <br />
		Tolerance:
		<input
			type="input"
			style="width: 2em; border: 1px solid black; margin: 0 0 10px 4px;"
			bind:value={dependencyLiftTolerance}
			on:keyup={d => {
				const num = Math.trunc(Number(dependencyLiftTolerance));
				dependencyLiftTolerance = num === 0 ? '' : String(num || 0);
				config.dependencyTolerance = num || 0;
			}}
		/>
		<Toggle
			class="ml-4"
			bind:state={liftAll}
			onToggle={() => {
				liftAll = !liftAll;
				if (liftAll) {
					config.dependencyLifting = flattenNodes.map(n => ({
						node: n,
						sensitivity: config.dependencyTolerance ?? 0,
					}));
				} else {
					config.dependencyLifting = [];
				}
				doRefilter = true;
			}}
		>
			{config.dependencyLifting.length > 0
				? config.dependencyLifting.length < flattenNodes.length
					? 'Some edged lifted'
					: 'All edges lifted'
				: 'No edges lifted'}
		</Toggle>
		<Toggle
			class="ml-4"
			bind:state={hideHierarchicalEdges}
			onToggle={() => {
				hideHierarchicalEdges = !hideHierarchicalEdges;
				if (hideHierarchicalEdges) {
					config.hideHierarchicalEdges = config.dependencyTolerance ?? 0;
				} else {
					config.hideHierarchicalEdges = undefined;
				}
				doRefilter = true;
			}}
		>
			Hide edges crossing levels
		</Toggle>
	</div>
</div>
