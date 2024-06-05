<script lang="ts">
	import Toggle from '$ui/toggle.svelte';
	import Heading from '$ui/heading.svelte';
	import type {RawInputType} from '$types/raw-data';
	import type {RawDataConfigType} from '$types';

	export let rawData: RawInputType = {};
	export let doReconvert: boolean;
	export let rawDataConfig: RawDataConfigType;

	let files: FileList;
	let useExampleData = true;
	let disableButton = true;

	const loadItems = async (file: File) => {
		let text = await file.text();

		rawData = JSON.parse(text);
		rawData!.fileName = file.name;
		doReconvert = true;
	};

	$: {
		if (files) {
			disableButton = false;
		} else {
			disableButton = true;
		}
	}

	// TODO: need to fix. whenever file is changed, bellow is triggered. we don't want unnecessary reconvert
	$: {
		if (useExampleData) {
			rawData = {};
			doReconvert = true;
		} else {
			loadItems(files[0]);
		}
	}
</script>

<div class="">
	<Heading>Input raw data</Heading>
	<label for="uploader">Upload a json file:</label><br />
	<input
		accept="application/json"
		bind:files
		id="uploader"
		name="uploader"
		type="file"
		on:change={() => {
			if (files.length > 0) {
				useExampleData = false;
			}
		}}
	/>
	<Toggle
		class="mt-2"
		bind:state={useExampleData}
		onToggle={() => {
			if (!disableButton) {
				useExampleData = !useExampleData;
			}
		}}
		bind:disabled={disableButton}
	>
		Use example data
	</Toggle>
	<Toggle
		class="mt-2"
		bind:state={rawDataConfig.filterPrimitives}
		onToggle={() => {
			rawDataConfig.filterPrimitives = !rawDataConfig.filterPrimitives;
			doReconvert = true;
		}}
	>
		Omit primitive types
	</Toggle>
	<Toggle
		class="mt-2"
		bind:state={rawDataConfig.filterAllEncompassingNodes}
		onToggle={() => {
			rawDataConfig.filterAllEncompassingNodes = !rawDataConfig.filterAllEncompassingNodes;
			doReconvert = true;
		}}
	>
		Omit all-encompassing classes
	</Toggle>
</div>
