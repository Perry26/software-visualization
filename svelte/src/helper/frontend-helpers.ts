import type {LayoutNestingLevels} from '$types';

export function toScreenName(s: LayoutNestingLevels) {
	if (s === 'root') return 'Top';
	if (s === 'intermediate') return 'Middle';
	if (s === 'inner') return 'Leaf';
}

export function saveStringToFile(s: string, type: string, extension: string, fileName: string) {
	const date = new Date();
	//const saveFileName = `${fileName}D${date.getFullYear()}-${date.getMonth()}-${date.getDay()}T${date.getHours()}-${date.getMinutes()}-${date.getSeconds()}.${extension}`;
	const saveFileName = `${fileName}.${extension}`;

	const blob = new Blob([s ?? ''], {type: type});
	const a = document.createElement('a');
	a.download = saveFileName;
	a.href = URL.createObjectURL(blob);
	a.dataset.downloadurl = [type, a.download, a.href].join(':');
	a.style.display = 'none';
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	setTimeout(function () {
		URL.revokeObjectURL(a.href);
	}, 1500);
}
