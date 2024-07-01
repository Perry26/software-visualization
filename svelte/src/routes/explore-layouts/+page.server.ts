import type {DrawSettingsInterface} from '$types';
import {readFileSync, readdirSync} from 'fs';

export function load(_) {
	const string = readFileSync('../python/output-data/evaluationResults.csv').toString();
	// Parse the csv-data.
	// While we're at it, we also convert stuff to a number if possible
	const evaluationResults = string
		.split('\n')
		.map(s => s.split(';').map((s, i) => (i < 10 ? Number(s) : s)));

	// Now the JSON data
	const jsonObject: {[hash: string]: DrawSettingsInterface} = {};
	readdirSync('../python/output-data/json').forEach(f => {
		const hash = f.replace('.json', '');
		const t = readFileSync('../python/output-data/json/' + f).toString();
		const obj = JSON.parse(t.split(';')[0]);
		jsonObject[hash] = obj;
	});

	// Let's also keep the headers, for ease of use
	// The final column is the hash value, and is unlabelled.
	const header = string
		.split('\n')[0]
		.split(';')
		.map(d => d.replace(/['"]+/g, ''));

	return {
		evaluationResults: evaluationResults.filter(e => e.length === 11),
		header,
		jsonData: jsonObject,
	};
}
