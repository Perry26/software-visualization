import {distance, geometricMean, notNaN, toHTMLToken} from '$helper';
import {getAbsCoordinates, getNode} from '$helper/graphdata-helpers';
import type {
	DrawSettingsInterface,
	EdgeRoutingOrigin,
	GraphDataEdge,
	GraphDataNode,
	GraphDataNodeDrawn,
	SimpleNodesDictionaryType,
} from '$types';

/**
 * Render and or update all given links
 * Requires access to all nodes via a dictionary, since links might not contain a reference to their source/target
 * Binds the data
 */
export function renderLinks(
	links: GraphDataEdge[],
	nodesDictionary: SimpleNodesDictionaryType,
	linkCanvas: d3.Selection<SVGGElement, unknown, null, undefined>,
	drawSettings: DrawSettingsInterface,
) {
	function calculateIntersection(
		source: {x: number; y: number; width: number; height: number},
		target: {x: number; y: number; width: number; height: number},
	) {
		const dx = target.x - source.x;
		const dy = target.y - source.y;
		const angle = Math.atan2(dy, dx);

		// Determine intersection with source rectangle
		let x, y;
		if (Math.abs(dx) * source.height > Math.abs(dy) * source.width) {
			// Intersection is with left or right edge of the rectangle
			x = dx > 0 ? source.width / 2 : -source.width / 2;
			y = x * Math.tan(angle);
		} else {
			// Intersection is with top or bottom edge of the rectangle
			y = dy > 0 ? source.height / 2 : -source.height / 2;
			x = y / Math.tan(angle);
		}
		const intersectionSource = {x: source.x + x, y: source.y + y};

		// Determine intersection with target rectangle
		if (Math.abs(dx) * target.height > Math.abs(dy) * target.width) {
			// Intersection is with left or right edge of the rectangle
			x = dx > 0 ? -target.width / 2 : target.width / 2;
			y = x * Math.tan(angle);
		} else {
			// Intersection is with top or bottom edge of the rectangle
			y = dy > 0 ? -target.height / 2 : target.height / 2;
			x = y / Math.tan(angle);
		}
		const intersectionTarget = {x: target.x + x, y: target.y + y};

		// TODO above code is bugged and may return -infinity on dataset jhotdraw-trc-sum
		// Will need to figure out why later
		// We'll just set it to 0 for now
		if (!Number.isFinite(intersectionTarget.x)) {
			intersectionTarget.x = 0;
		}
		if (!Number.isFinite(intersectionTarget.y)) {
			intersectionTarget.y = 0;
		}
		if (!Number.isFinite(intersectionSource.x)) {
			intersectionSource.x = 0;
		}
		if (!Number.isFinite(intersectionSource.y)) {
			intersectionSource.y = 0;
		}

		return {intersectionSource, intersectionTarget};
	}

	/** Returns path coordinates, and annotates the line-data with extra info.
	 *
	 * Routes edges through edge port
	 */
	function annotateLine(l: GraphDataEdge, intersection = false) {
		// calculateIntersection
		const source = (
			typeof l.source === 'string' ? nodesDictionary[l.source] : l.source
		) as GraphDataNodeDrawn;
		const target = (
			typeof l.target === 'string' ? nodesDictionary[l.target] : l.target
		) as GraphDataNodeDrawn;

		l.gradientDirection = source.x! > target.x!;

		/** List of all coordinates the path will need to go through */
		l.renderPoints = [
			...l.routing.map(point => {
				const {x, y} = getAbsCoordinates(point.origin);
				return {
					x: x + point.x,
					y: y + point.y,
					origin: point.origin,
				};
			}),
		];

		if (l.renderPoints.length < 2) {
			l.renderPoints = [
				{x: source.x, y: source.y},
				{x: target.x, y: target.y},
			];
		}

		// TODO fix error in  calculateIntersection
		// if (intersection) {
		// 	const t = calculateIntersection(l.renderPoints[0], l.renderPoints[l.renderPoints.length - 1]);
		// 	l.renderPoints[0] = t.intersectionSource;
		// 	l.renderPoints[l.renderPoints.length - 1] = t.intersectionTarget;
		// }

		l.labelCoordinates = [l.renderPoints[0], l.renderPoints[1]];

		let result = `M ${l.renderPoints[0].x} ${l.renderPoints[0].y}`;

		l.renderPoints.forEach(({x, y}) => {
			result += `L ${notNaN(x)} ${notNaN(y)} `;
		});

		return result;
	}

	// Enter
	linkCanvas
		.selectAll('path')
		.data(
			links.filter(l => l.hidden != true),
			l => (l as GraphDataEdge).id,
		)
		.enter()
		.append('path')
		.attr('id', l => `line-${toHTMLToken(l.id)}`)
		.attr('d', l => {
			if (drawSettings.showEdgePorts) {
				return annotateLine(l);
			} else {
				l.routing = [
					{x: 0, y: 0, origin: getNode(l.source, nodesDictionary) as EdgeRoutingOrigin},
					{x: 0, y: 0, origin: getNode(l.target, nodesDictionary) as EdgeRoutingOrigin},
				];
				return annotateLine(l, true);
			}
		})
		.attr(
			'stroke',
			l => `url(#${toHTMLToken(l.type)}Gradient${l.gradientDirection ? 'Reversed' : ''})`,
		)
		.attr('fill', 'none')
		.on('mouseover', (e, d) => {});

	// Update
	(
		linkCanvas.selectAll('path') as d3.Selection<
			SVGPathElement,
			GraphDataEdge,
			SVGGElement,
			unknown
		>
	)
		.attr('d', l => annotateLine(l, !drawSettings.showEdgePorts))
		.attr(
			'stroke',
			l => `url(#${toHTMLToken(l.type)}Gradient${l.gradientDirection ? 'Reversed' : ''})`,
		)
		.attr('display', l => {
			const res = drawSettings.shownEdgesType.get(l.type) ? 'inherit' : 'none';
			return res;
		});

	// No exit, since we don't get all edges when updating

	// Labels
	if (drawSettings.showEdgeLabels) {
		linkCanvas
			.selectAll('text')
			.data(links, l => (l as GraphDataEdge).id)
			.enter()
			.append('text')
			.attr('class', 'link-label')
			.attr('text-anchor', 'middle')
			.attr('dominant-baseline', 'middle')
			.attr('fill', 'black')
			.attr('font-size', '10px')
			.text(l => l.id);

		(linkCanvas.selectAll('text') as d3.Selection<d3.BaseType, GraphDataEdge, SVGGElement, unknown>)
			.attr('x', l => (l.labelCoordinates![0].x + l.labelCoordinates![1].x) / 2)
			.attr('y', l => (l.labelCoordinates![0].y + l.labelCoordinates![1].y) / 2);
	} else if (!drawSettings.showEdgeLabels) {
		linkCanvas.selectAll('text').remove();
	}

	// Cleanup, just to be sure:
	links.forEach(l => {
		l.labelCoordinates = undefined;
		l.gradientDirection = undefined;
	});
}
