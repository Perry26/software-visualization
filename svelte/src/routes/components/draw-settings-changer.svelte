<script lang="ts">
	import Toggle from '$ui/toggle.svelte';
	import Heading from '$ui/heading.svelte';
	import type {DrawSettingsInterface, LayoutOptions} from '$types';
	import Input from '$ui/input.svelte';
	import Button from '$ui/button.svelte';
	import {colorPallets, getNodeColors} from '$scripts';
	import {toScreenName} from '$helper/frontend-helpers';
	export let drawSettings: DrawSettingsInterface;
	export let doRedraw;
	export let maximumDepth: number;
	let colorScheme: string | undefined;
	let colorSchemeSettings = {inverted: true, increaseBrightness: true, increaseSaturation: true};

	function reloadColorScheme(_: any) {
		if (colorScheme) {
			const {nodeColors, nodeDefaultColor} = getNodeColors(
				maximumDepth,
				colorScheme,
				colorSchemeSettings,
			);
			(drawSettings.nodeColors = nodeColors), maximumDepth;
			drawSettings.nodeDefaultColor = nodeDefaultColor;
		}
	}

	// layout options
	let options: LayoutOptions[] = ['layerTree', 'straightTree', 'circular'];
</script>

<div class="w-full">
	<Heading class="mt-2">Draw Settings Changer</Heading>
	<!-- Filter Edge -->
	<div class="filter-edge">
		<Heading headingNumber={5}>Filter Edge</Heading>
		<div class="ml-4 flex flex-col w-full">
			{#if drawSettings.shownEdgesType}
				{#each drawSettings.shownEdgesType as [edgeType, isShown], index}
					<div class="inline align-middle">
						<input
							type="checkbox"
							id={edgeType}
							name="edgeType"
							on:click={e => {
								drawSettings.shownEdgesType?.set(edgeType, e.currentTarget.checked);
								doRedraw = true;
							}}
							bind:checked={isShown}
						/>
						<label for={edgeType}>{edgeType}</label>
					</div>
				{/each}
			{/if}
		</div>
	</div>

	<!-- Show Edges Label -->
	<div>
		<Heading headingNumber={5}>Show Edges Label</Heading>
		<Toggle
			class="ml-4"
			onToggle={() => {
				drawSettings.showEdgeLabels = !drawSettings.showEdgeLabels;
				doRedraw = true;
			}}
			state={drawSettings.showEdgeLabels}
		>
			{drawSettings.showEdgeLabels ? 'Hide' : 'Show'}
		</Toggle>
	</div>

	<!-- Show Node Label -->
	<div>
		<Heading headingNumber={5}>Show Node Label</Heading>
		<Toggle
			class="ml-4"
			onToggle={() => {
				drawSettings.showNodeLabels = !drawSettings.showNodeLabels;
				doRedraw = true;
			}}
			state={drawSettings.showNodeLabels}
		>
			{drawSettings.showNodeLabels ? 'Hide' : 'Show'}
		</Toggle>
	</div>

	<!-- Show Buttons -->
	<div>
		<Heading headingNumber={5}>Show Node Buttons</Heading>
		<Toggle
			class="ml-4"
			onToggle={() => {
				drawSettings.showNodeButtons = !drawSettings.showNodeButtons;
				doRedraw = true;
			}}
			state={drawSettings.showNodeButtons}
		>
			{drawSettings.showNodeButtons ? 'Hide' : 'Show'}
		</Toggle>
	</div>

	<!-- seperator -->
	<div class="h-8" />

	<!-- Button Radius -->
	<div>
		<Heading headingNumber={5}>Button Radius</Heading>
		<Input
			type="number"
			value={drawSettings.buttonRadius}
			onChange={e => {
				drawSettings.buttonRadius = Number(e.currentTarget.value);
				drawSettings.nodePadding = Math.max(drawSettings.buttonRadius, drawSettings.nodePadding);
				doRedraw = true;
			}}
		/>
	</div>

	<!-- nodeCornerRadius -->
	<div>
		<Heading headingNumber={5}>Node Corner Radius</Heading>
		<Input
			type="number"
			value={drawSettings.nodeCornerRadius}
			onChange={e => {
				drawSettings.nodeCornerRadius = Number(e.currentTarget.value);
				doRedraw = true;
			}}
		/>
	</div>

	<!-- seperator -->
	<div class="h-8" />

	<!-- Auto-node colors-->
	<div>
		<Heading headingNumber={5}>Use node colorscheme</Heading>
		<select bind:value={colorScheme} on:change={reloadColorScheme} class="ml-4">
			<option value={undefined}>Custom color scheme</option>
			{#each colorPallets as value}
				<option {value}>{value}</option>
			{/each}
		</select><br />
		<input
			class="ml-4"
			type="checkbox"
			bind:checked={colorSchemeSettings.inverted}
			on:change={reloadColorScheme}
		/>
		Invert <br />
		<input
			class="ml-4"
			type="checkbox"
			bind:checked={colorSchemeSettings.increaseBrightness}
			on:change={reloadColorScheme}
		/>
		Force decreasing brightness <br />
		<input
			class="ml-4"
			type="checkbox"
			bind:checked={colorSchemeSettings.increaseSaturation}
			on:change={reloadColorScheme}
		/> Force decreasing saturation
	</div>

	<div class="h-8" />

	<!-- default node color -->
	<div>
		<Heading headingNumber={5}>Default Node Color</Heading>
		<Input
			type="color"
			value={drawSettings.nodeDefaultColor}
			onChange={e => {
				drawSettings.nodeDefaultColor = e.currentTarget.value;
				doRedraw = true;
				colorScheme = undefined;
			}}
		/>
	</div>

	<!-- node colors -->
	<div>
		<Heading headingNumber={5}>Node Colors</Heading>
		{#each drawSettings.nodeColors as color, index}
			{#if drawSettings.colorFromBottom && index == 0}
				<Heading headingNumber={6}>{toScreenName('root')} level</Heading>
			{:else if drawSettings.colorFromBottom && index == drawSettings.nodeColors.length - 1}
				<Heading headingNumber={6}>{toScreenName('inner')} level</Heading>
			{:else if drawSettings.colorFromBottom && index == 1}
				<Heading headingNumber={6}>{toScreenName('intermediate')} level</Heading>
			{/if}
			<div class="flex">
				<input
					type="color"
					value={color}
					class="mx-4 my-1"
					on:change={e => {
						drawSettings.nodeColors[index] = e.currentTarget.value;
						doRedraw = true;
						colorScheme = undefined;
					}}
				/>
				<!-- remove level -->
				{#if !(drawSettings.colorFromBottom && (index == 0 || index == drawSettings.nodeColors.length - 1))}
					<button
						class="font-medium text-red-600"
						on:click={() => {
							drawSettings.nodeColors.splice(index, 1);
							doRedraw = true;
							drawSettings.nodeColors = drawSettings.nodeColors;
							colorScheme = undefined;
						}}
					>
						Remove this level
					</button>
				{/if}
			</div>
		{/each}
		<div class="h-2" />
		<!-- add new level -->
		<Button
			onClick={() => {
				drawSettings.nodeColors.push('#000000');
				doRedraw = true;
				drawSettings.nodeColors = drawSettings.nodeColors;
				colorScheme = undefined;
			}}
		>
			Add new level
		</Button>

		<!-- Colors from bottom -->
		<div>
			<Heading headingNumber={5}>Calculate node colors from bottom</Heading>
			{#if drawSettings.nodeColors.length < 2}
				<span class="text-gray-300">
					(Cannot be enabled while less than 2 node colors are defined)
				</span>
			{/if}
			<Toggle
				class="ml-4"
				onToggle={() => {
					drawSettings.colorFromBottom = !drawSettings.colorFromBottom;
					doRedraw = true;
				}}
				state={drawSettings.colorFromBottom}
				disabled={drawSettings.nodeColors.length < 2}
			>
				{drawSettings.colorFromBottom ? 'From bottom' : 'From top'}
			</Toggle>
		</div>
		<!-- Invert port colors -->
		<div>
			<Heading headingNumber={5}>Invert port levels</Heading>
			<Toggle
				class="ml-4"
				onToggle={() => {
					drawSettings.invertPortColors = !drawSettings.invertPortColors;
					doRedraw = true;
				}}
				state={drawSettings.invertPortColors}
			>
				{drawSettings.invertPortColors ? 'Inverted' : 'Normal'}
			</Toggle>
		</div>
	</div>
</div>
