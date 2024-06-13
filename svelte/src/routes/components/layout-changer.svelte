<script lang="ts">
	import Toggle from '$ui/toggle.svelte';
	import Heading from '$ui/heading.svelte';
	import type {
		DrawSettingsInterface,
		LayoutNestingLevels,
		LayoutOptions,
		ManyBodyForceOptions,
	} from '$types';
	import Input from '$ui/input.svelte';
	import {toScreenName} from '$helper/frontend-helpers';
	export let drawSettings: DrawSettingsInterface;
	export let doRelayout;

	// layout options
	let options: LayoutOptions[] = ['layerTree', 'straightTree', 'circular', 'forceBased'];
	let layoutNestingLevels: LayoutNestingLevels[] = ['root', 'intermediate', 'inner'];
	let manyBodyForceOptions: ManyBodyForceOptions[] = ['Charge', 'Rectangular', 'None'];

	function getBgColor(level: LayoutNestingLevels, drawSettings: DrawSettingsInterface): string {
		if (level === 'root') {
			return drawSettings.nodeColors[0];
		} else if (level === 'inner') {
			return drawSettings.nodeColors[drawSettings.nodeColors.length - 1];
		} else {
			return drawSettings.nodeColors.length > 2
				? drawSettings.nodeColors[1]
				: drawSettings.nodeDefaultColor;
		}
	}
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
		{#each layoutNestingLevels as level}
			<div
				class="{drawSettings.colorFromBottom ? '' : 'bg-slate-100'} rounded-md p-4 mb-4 mr-8 ml-0"
				style={drawSettings.colorFromBottom
					? `background-color: ${getBgColor(level, drawSettings)}40`
					: ''}
			>
				<Heading headingNumber={5}>{toScreenName(level)} Layout</Heading>
				<select
					bind:value={drawSettings[`${level}Layout`]}
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
					value={drawSettings.nodeMargin[level]}
					onChange={e => {
						drawSettings.nodeMargin[level] = Number(e.currentTarget.value);
						doRelayout = true;
					}}
				/> Node Margin <br />
				{#if ['layerTree', 'straightTree'].includes(drawSettings[`${level}Layout`])}
					<div class="h-4" />
					<Toggle
						class="ml-4"
						onToggle={() => {
							drawSettings.layoutSettings[level].uniformSize =
								!drawSettings.layoutSettings[level].uniformSize;
							doRelayout = true;
						}}
						state={drawSettings.layoutSettings[level].uniformSize}>Uniform node sizes</Toggle
					>
				{/if}
				{#if ['forceBased'].includes(drawSettings[`${level}Layout`])}
					<div class="h-4" />
					<em>Many body force <br /></em>
					<select
						bind:value={drawSettings.layoutSettings[level].manyBodyForce.type}
						on:change={() => {
							doRelayout = true;
						}}
					>
						{#each manyBodyForceOptions as value}<option {value}>{value}</option>{/each}
					</select>
					Type
					<br />
					<Input
						type="number"
						value={drawSettings.layoutSettings[level].manyBodyForce.strength}
						onChange={e => {
							drawSettings.layoutSettings[level].manyBodyForce.strength = Number(
								e.currentTarget.value,
							);
							doRelayout = true;
						}}
						disabled={drawSettings.layoutSettings[level].manyBodyForce.type === 'None'}
						min={-50}
						max={50}
					/> Strength<br />
					<div class="h-4" />
					<em>Undo rectangle collision at every tick<br /></em>
					<Toggle
						class="ml-4"
						onToggle={() => {
							drawSettings.layoutSettings[level].collideRectangles =
								!drawSettings.layoutSettings[level].collideRectangles;
							doRelayout = true;
						}}
						state={drawSettings.layoutSettings[level].collideRectangles}
					/>
					<div class="h-4" />
					<em>Center force <br /></em>
					<Toggle
						class="ml-4"
						onToggle={() => {
							drawSettings.layoutSettings[level].centerForceStrength.enabled =
								!drawSettings.layoutSettings[level].centerForceStrength.enabled;
							doRelayout = true;
						}}
						state={drawSettings.layoutSettings[level].centerForceStrength.enabled}
					>
						Enabled
					</Toggle>
					<Input
						type="number"
						value={drawSettings.layoutSettings[level].centerForceStrength.x}
						onChange={e => {
							drawSettings.layoutSettings[level].centerForceStrength.x = Number(
								e.currentTarget.value,
							);
							doRelayout = true;
						}}
						disabled={!drawSettings.layoutSettings[level].centerForceStrength.enabled}
						step={0.1}
						min={-50}
						max={50}
					/> x-strength<br />
					<Input
						type="number"
						value={drawSettings.layoutSettings[level].centerForceStrength.y}
						onChange={e => {
							drawSettings.layoutSettings[level].centerForceStrength.y = Number(
								e.currentTarget.value,
							);
							doRelayout = true;
						}}
						disabled={!drawSettings.layoutSettings[level].centerForceStrength.enabled}
						step={0.1}
						min={-50}
						max={50}
					/> y-strength<br />
					<div class="h-4" />
					<em>Link force <br /></em>
					<Toggle
						class="ml-4"
						onToggle={() => {
							drawSettings.layoutSettings[level].linkForce.enabled =
								!drawSettings.layoutSettings[level].linkForce.enabled;
							doRelayout = true;
						}}
						state={drawSettings.layoutSettings[level].linkForce.enabled}
					>
						Enabled
					</Toggle>
					<Input
						type="number"
						value={drawSettings.layoutSettings[level].linkForce.distance}
						onChange={e => {
							drawSettings.layoutSettings[level].linkForce.distance = Number(e.currentTarget.value);
							doRelayout = true;
						}}
						disabled={!drawSettings.layoutSettings[level].linkForce.enabled}
					/> Distance<br />
					<Input
						type="number"
						value={drawSettings.layoutSettings[level].linkForce.strength}
						onChange={e => {
							drawSettings.layoutSettings[level].linkForce.strength = Number(e.currentTarget.value);
							doRelayout = true;
						}}
						disabled={!drawSettings.layoutSettings[level].linkForce.enabled}
						step={0.1}
						min={-50}
						max={50}
					/> Strength<br />
				{/if}
			</div>
		{/each}
	</div>
</div>
