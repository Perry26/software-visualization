<script lang="ts">
	import Toggle from '$ui/toggle.svelte';
	import Heading from '$ui/heading.svelte';
	import type {DrawSettingsInterface, LayoutOptions} from '$types';
	import Input from '$ui/input.svelte';
	import Button from '$ui/button.svelte';
	export let drawSettings: DrawSettingsInterface;
	export let doRelayout;

	// layout options
	let options: LayoutOptions[] = ['layerTree', 'straightTree', 'circular'];
</script>

<div class="overflow-auto">
	<Heading class="mt-2">Layout Changer</Heading>

	<!-- Show Edge Port -->
	<div>
		<Heading headingNumber={5}>Show Edge Port</Heading>
		<Toggle
			class="ml-4"
			onToggle={() => {
				drawSettings.showEdgePorts = !drawSettings.showEdgePorts;
				doRelayout = true;
			}}
			state={drawSettings.showEdgePorts}
		>
			{drawSettings.showEdgePorts ? 'Hide' : 'Show'}
		</Toggle>
	</div>

	<!-- seperator -->
	<div class="h-8" />

	<!-- Node Size -->
	<div>
		<Heading headingNumber={5}>Node Size</Heading>
		<Input
			type="number"
			value={drawSettings.minimumNodeSize}
			onChange={e => {
				drawSettings.minimumNodeSize = Number(e.currentTarget.value);
				doRelayout = true;
			}}
		/>
	</div>

	<!-- node padding -->
	<div>
		<Heading headingNumber={5}>node padding</Heading>
		<Input
			type="number"
			value={drawSettings.nodePadding}
			onChange={e => {
				drawSettings.nodePadding = Number(e.currentTarget.value);
				doRelayout = true;
			}}
		/>
	</div>
	<!-- seperator -->
	<div class="h-8" />

	<!-- layout settings -->
	<div>
		<Heading headingNumber={5}>Inner Layout</Heading>

		<select
			bind:value={drawSettings.innerLayout}
			on:change={() => {
				doRelayout = true;
			}}
		>
			{#each options as value}<option {value}>{value}</option>{/each}
		</select>
		Layout algorithm
		<Input
			type="number"
			value={drawSettings.nodeMargin.inner}
			onChange={e => {
				drawSettings.nodeMargin.inner = Number(e.currentTarget.value);
				doRelayout = true;
			}}
		/> Node Margin
		<Heading headingNumber={5}>Intermediate Layout</Heading>

		<select
			bind:value={drawSettings.intermediateLayout}
			on:change={() => {
				doRelayout = true;
			}}
		>
			{#each options as value}<option {value}>{value}</option>{/each}
		</select>
		Layout algorithm
		<Input
			type="number"
			value={drawSettings.nodeMargin.intermediate}
			onChange={e => {
				drawSettings.nodeMargin.intermediate = Number(e.currentTarget.value);
				doRelayout = true;
			}}
		/> Node Margin
		<Heading headingNumber={5}>Root Layout</Heading>

		<select
			bind:value={drawSettings.rootLayout}
			on:change={() => {
				doRelayout = true;
			}}
		>
			{#each options as value}<option {value}>{value}</option>{/each}
		</select>
		Layout algorithm
		<Input
			type="number"
			value={drawSettings.nodeMargin.root}
			onChange={e => {
				drawSettings.nodeMargin.root = Number(e.currentTarget.value);
				doRelayout = true;
			}}
		/> Node Margin
	</div>
</div>
