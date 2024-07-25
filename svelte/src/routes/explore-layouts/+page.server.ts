import type {DrawSettingsInterface} from '$types';
//import {readFileSync, readdirSync, writeFileSync} from 'fs';
import data from './data.txt?raw';

const localMode = false;
const serverMode = true;
const writeMode = false;

export function load(_): {
	evaluationResults: (number | string)[][];
	header: string[];
	jsonData: {
		[hash: string]: DrawSettingsInterface;
	};
} {
	if (localMode) {
		/*
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

		const result = {
			evaluationResults: evaluationResults.filter(e => e.length === 11),
			header,
			jsonData: jsonObject,
		};

		if (writeMode) {
			writeFileSync('./src/routes/explore-layouts/data.txt', JSON.stringify(result));
		}

		return result;
		*/
	} else if (serverMode) {
		return JSON.parse(data);
	}
	throw new Error();
}
