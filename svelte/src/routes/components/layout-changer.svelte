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
		<Heading headingNumber={5}>Node Padding</Heading>
		<Input
			type="number"
			value={drawSettings.nodePadding}
			onChange={e => {
				drawSettings.nodePadding = Math.max(
					Number(e.currentTarget.value),
					2 * drawSettings.buttonRadius,
				);
				e.currentTarget.value = drawSettings.nodePadding;
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
		<br />
		<Input
			type="number"
			value={drawSettings.nodeMargin.inner}
			onChange={e => {
				drawSettings.nodeMargin.inner = Number(e.currentTarget.value);
				doRelayout = true;
			}}
		/> Node Margin
		<Toggle
			class="ml-4"
			onToggle={() => {
				drawSettings.layoutSettings.inner.uniformSize =
					!drawSettings.layoutSettings.inner.uniformSize;
				doRelayout = true;
			}}
			state={drawSettings.layoutSettings.inner.uniformSize}
			disabled={!['layerTree', 'straightTree'].includes(drawSettings.innerLayout)}
			>Uniform node sizes</Toggle
		>
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
		<br />
		<Input
			type="number"
			value={drawSettings.nodeMargin.intermediate}
			onChange={e => {
				drawSettings.nodeMargin.intermediate = Number(e.currentTarget.value);
				doRelayout = true;
			}}
		/> Node Margin

		<Toggle
			class="ml-4"
			onToggle={() => {
				drawSettings.layoutSettings.intermediate.uniformSize =
					!drawSettings.layoutSettings.intermediate.uniformSize;
				doRelayout = true;
			}}
			state={drawSettings.layoutSettings.intermediate.uniformSize}
			disabled={!['layerTree', 'straightTree'].includes(drawSettings.intermediateLayout)}
			>Uniform node sizes</Toggle
		>

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
		<br />
		<Input
			type="number"
			value={drawSettings.nodeMargin.root}
			onChange={e => {
				drawSettings.nodeMargin.root = Number(e.currentTarget.value);
				doRelayout = true;
			}}
		/> Node Margin
		<Toggle
			class="ml-4"
			onToggle={() => {
				drawSettings.layoutSettings.root.uniformSize =
					!drawSettings.layoutSettings.root.uniformSize;
				doRelayout = true;
			}}
			state={drawSettings.layoutSettings.root.uniformSize}
			disabled={!['layerTree', 'straightTree'].includes(drawSettings.rootLayout)}
			>Uniform node sizes</Toggle
		>
	</div>
</div>
