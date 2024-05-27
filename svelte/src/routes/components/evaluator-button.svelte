<script lang="ts">
	import Heading from '$ui/heading.svelte';
	import type {LayoutMetrics} from '$scripts/draw/metrics';

	export let evaluator: LayoutMetrics | undefined;
	export let results: string = '';
</script>

<div>
	<Heading class="mt-2">Evaluator</Heading>
	<input
		type="button"
		on:click={async _ => {
			if (!evaluator) {
				console.error('No evaluator found; you probably need to reload the page');
			} else {
				results = '';
				results = evaluator.run();
			}
		}}
		value={'Run'}
		class="bg-transparent hover:bg-blue-500 text-blue-700 font-semibold hover:text-white py-2 px-4 border border-blue-500 hover:border-transparent rounded"
	/>
	<div style="white-space: pre-line">{results}</div>
</div>
