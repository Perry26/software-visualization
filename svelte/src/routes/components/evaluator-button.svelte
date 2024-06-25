<script lang="ts">
	import Heading from '$ui/heading.svelte';
	import type {LayoutMetrics} from '$scripts/draw/metrics';
	import { saveStringToFile } from '$helper/frontend-helpers';

	export let evaluator: LayoutMetrics | undefined;
	export function resetEvaluator() {
		copyString = undefined;
		tableString = '';
	}
	export let fileName: string | undefined;
	let copyString: string | undefined = undefined;
	let tableString : string = '';
	export let padding: number;

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


	function saveEvaluationResults() {
		saveStringToFile(copyString ?? '', 'text/csv', 'csv', fileName ?? "undefined");
	}

	function savePicture() {
		const content = document.getElementById("canvas")!.innerHTML;
		const {maxX, minX, maxY, minY} = evaluator!.getBoundaries();

		const string = `<svg viewBox="${minX - padding}, ${minY - padding}, ${maxX - minX + 2 * padding}, ${maxY - minY + 2 * padding}" style="background-color: white" xmlns="http://www.w3.org/2000/svg">` 
			+ `<rect x="${minX - padding - 1}" y="${minY - padding - 1}" width="${maxX - minX + 2 * padding + 2}" height="${maxY - minY + 2 * padding + 2}" fill="white" />`
			+ content 
			+ "</svg>"
		saveStringToFile(string, 'text/svg', 'svg', fileName ?? "undefined")
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
				saveEvaluationResults();
			}
		}}
		value={'Run and save'}
		class="bg-transparent hover:bg-blue-500 text-blue-700 font-semibold hover:text-white py-2 px-4 border border-blue-500 hover:border-transparent rounded"
	/> 

	<input
		type="button"
		on:click={async _ => {
			savePicture()
		}}
		value={'Save Figure'}
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
