<script lang="ts">
	import {SidePanelTab} from '$types/ui';

	export let sidePanelTab: SidePanelTab;

	const firstClass = 'rounded-s-lg';
	const selectedClass =
		'text-gray-900 bg-gray-100 active focus:outline-none dark:bg-gray-700 dark:text-white cursor-default';
	const notSelectedClass =
		'bg-white hover:text-gray-700 hover:bg-gray-50 focus:outline-none dark:hover:text-white dark:bg-gray-800 dark:hover:bg-gray-700';
	const defaultClasses = 'inline-block w-full p-4  border-gray-200 dark:border-gray-700';
	const middleClasses = 'border-r';
	const lastClasses = 'border-s-0 rounded-e-lg';

	const tabs = Object.values(SidePanelTab).filter(t => typeof t === 'string') as string[];
</script>

<ul
	class="hidden text-sm font-medium text-center text-gray-500 rounded-lg shadow sm:flex dark:divide-gray-700 dark:text-gray-400 overflow-x-auto"
>
	{#each tabs as tab, i}
		<li class="w-full focus-within:z-10">
			<button
				on:click={() => {
					//@ts-ignore
					sidePanelTab = SidePanelTab[tab];
				}}
				class={`${defaultClasses} 
                ${i === tabs.length - 1 ? lastClasses : middleClasses}
                ${i === 0 ? firstClass : ''}
                ${
									//@ts-ignore
									sidePanelTab === SidePanelTab[tab] ? selectedClass : notSelectedClass
								}
                `}
				aria-current="page">{tab}</button
			>
		</li>
	{/each}
</ul>
