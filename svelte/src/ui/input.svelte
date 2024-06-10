<script lang="ts">
	export let type: string;
	export let value: any;
	export let disabled: boolean = false;
	export let step: number = 1;
	export let min: number = 1;
	export let max: number = 100;
	export let onChange: (e: any) => void;
</script>

<input class="ml-4 border-2" {type} {min} {max} {value} {disabled} {step} on:change={onChange} />
