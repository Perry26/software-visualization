<script lang="ts">
	import {SidePanelTab} from '$types/ui';

	export let sidePanelTab: SidePanelTab;

	const firstClass = 'rounded-s-lg';
	const selectedClass =
		'text-gray-900 bg-gray-100 active focus:outline-none dark:bg-gray-700 dark:text-white';
	const notSelectedClass =
		'bg-white hover:text-gray-700 hover:bg-gray-50 focus:outline-none dark:hover:text-white dark:bg-gray-800 dark:hover:bg-gray-700';
	const defaultClasses =
		'inline-block w-full p-4  border-gray-200 dark:border-gray-700 focus:ring-4';
	const middleClasses = 'border-r focus:ring-blue-300';
	const lastClasses = 'border-s-0 rounded-e-lg focus:ring-blue-300';

	const tabs = Object.values(SidePanelTab).filter(t => typeof t === 'string') as string[];
</script>

<ul
	class="hidden text-sm font-medium text-center text-gray-500 rounded-lg shadow sm:flex dark:divide-gray-700 dark:text-gray-400"
>
	{#each tabs as tab, i}
		<li class="w-full focus-within:z-10">
			<a
				href="#"
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
				aria-current="page">{tab}</a
			>
		</li>
	{/each}

	<!-- <li class="w-full focus-within:z-10">
		<a
			href="#"
			on:click={() => {
				sidePanelTab = SidePanelTab.Input;
			}}
			class="inline-block w-full p-4 text-gray-900 bg-gray-100 border-r border-gray-200 dark:border-gray-700 rounded-s-lg focus:ring-4 focus:ring-blue-300 active focus:outline-none dark:bg-gray-700 dark:text-white"
			aria-current="page">Input</a
		>
	</li>
	<li class="w-full focus-within:z-10">
		<a
			href="#"
			on:click={() => {
				sidePanelTab = SidePanelTab.Config;
			}}
			class="inline-block w-full p-4 bg-white border-r border-gray-200 dark:border-gray-700 hover:text-gray-700 hover:bg-gray-50 focus:ring-4 focus:ring-blue-300 focus:outline-none dark:hover:text-white dark:bg-gray-800 dark:hover:bg-gray-700"
			>Config</a
		>
	</li>
	<li class="w-full focus-within:z-10">
		<a
			href="#"
			on:click={() => {
				sidePanelTab = SidePanelTab.DrawSettings;
			}}
			class="inline-block w-full p-4 bg-white border-r border-gray-200 dark:border-gray-700 hover:text-gray-700 hover:bg-gray-50 focus:ring-4 focus:ring-blue-300 focus:outline-none dark:hover:text-white dark:bg-gray-800 dark:hover:bg-gray-700"
			>DrawSettings</a
		>
	</li>
	<li class="w-full focus-within:z-10">
		<a
			href="#"
			on:click={() => {
				sidePanelTab = SidePanelTab.Layout;
			}}
			class="inline-block w-full p-4 bg-white border-r border-gray-200 dark:border-gray-700 hover:text-gray-700 hover:bg-gray-50 focus:ring-4 focus:ring-blue-300 focus:outline-none dark:hover:text-white dark:bg-gray-800 dark:hover:bg-gray-700"
			>Layout</a
		>
	</li>
	<li class="w-full focus-within:z-10">
		<a
			href="#"
			on:click={() => {
				sidePanelTab = SidePanelTab.Evaluation;
			}}
			class="inline-block w-full p-4 bg-white border-s-0 border-gray-200 dark:border-gray-700 rounded-e-lg hover:text-gray-700 hover:bg-gray-50 focus:ring-4 focus:outline-none focus:ring-blue-300 dark:hover:text-white dark:bg-gray-800 dark:hover:bg-gray-700"
			>Evaluation</a
		>
	</li> -->
</ul>
