<script lang="ts">
	import Heading from '$ui/heading.svelte';
	import type {LayoutMetrics} from '$scripts/draw/metrics';

	export let evaluator: LayoutMetrics | undefined;
	export function resetEvaluator() {
		copyString = undefined;
		tableString = '';
	}
	export let fileName: string | undefined;
	let copyString: string | undefined = undefined;
	let tableString : string = '';

	function runEvaluator() {
		if (!evaluator) {
			console.error('No evaluator found; you probably need to reload the page');
			return false;
		} else {
			const run = evaluator.run();
			copyString = run.copyString;
			tableString = run.tableString;
			return true;
		}
	}

	function saveResults() {
		const date = new Date();
		const saveFileName = `${fileName}D${date.getFullYear()}-${date.getMonth()}-${date.getDay()}T${date.getHours()}-${date.getMinutes()}-${date.getSeconds()}.csv`

		const blob = new Blob([copyString ?? ''], {type:'text/csv'});
		const a = document.createElement('a');
  		a.download = saveFileName;
  		a.href = URL.createObjectURL(blob);
  		a.dataset.downloadurl = ['text/csv', a.download, a.href].join(':');
  		a.style.display = 'none';
  		document.body.appendChild(a);
  		a.click();
  		document.body.removeChild(a);
  		setTimeout(function() { URL.revokeObjectURL(a.href); }, 1500);
	}
</script>

<div>
	<Heading class="mt-1">Evaluator</Heading>
	<input
		type="button"
		on:click={async _ => {
			runEvaluator();
		}}
		value={'Run'}
		class="bg-transparent hover:bg-blue-500 text-blue-700 font-semibold hover:text-white py-2 px-4 border border-blue-500 hover:border-transparent rounded"
	/> 

	<input
		type="button"
		on:click={async _ => {
			if (runEvaluator()) {
				saveResults();
			}
		}}
		value={'Run and save'}
		class="bg-transparent hover:bg-blue-500 text-blue-700 font-semibold hover:text-white py-2 px-4 border border-blue-500 hover:border-transparent rounded"
	/> 

	<Heading class="mt-2" style="display: {copyString ? 'block' : 'none'}">Results</Heading>
	<br />
	<table>
		{@html tableString}
	</table>
	<br />
	<textarea
		id="message"
		rows="4"
		class="block p-2.5 w-full text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
		style="display: {copyString ? 'block' : 'none '}"
	>
{copyString}
	</textarea>
</div>
