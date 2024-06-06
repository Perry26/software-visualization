import * as d3 from 'd3';
import {toHTMLToken} from '$helper';
import type {DrawSettingsInterface, EdgePortMap, GraphDataNode} from '$types';

/**
 * Adds lift and collapse buttons to all groups with id .nodes (generated by renderNodes)
 * Assumes data is already bound.
 *
 * First removes existing buttons
 */
export function addLiftCollapseButtons(
	svgElement: Element,
	drawSettings: DrawSettingsInterface,
	onCollapse: (datum: GraphDataNode) => void,
	onLift: (datum: GraphDataNode) => void,
) {
	d3.select(svgElement).selectAll('circle').remove();

	const container = d3.select(svgElement).selectAll('g.nodes') as d3.Selection<
		d3.BaseType,
		GraphDataNode,
		Element,
		unknown
	>;

	container
		.filter(d => d.members.length > 0 || (d.originalMembers ?? []).length > 0)
		.append('circle')
		.attr('r', drawSettings.buttonRadius)
		.attr('cx', d => -0.5 * d.width! + 0.5 * drawSettings.nodePadding)
		.attr('cy', d => -0.5 * d.height! + 0.5 * drawSettings.nodePadding)
		.attr('fill', 'red')
		.attr('fill-opacity', '0.1')
		.on('click', (_e, i) => onCollapse(i));

	container
		.filter(d => d.members.length > 0)
		.append('circle')
		.attr('r', drawSettings.buttonRadius)
		.attr('cx', d => -0.5 * d.width! + 0.5 * drawSettings.nodePadding)
		.attr(
			'cy',
			d => -0.5 * d.height! + 1.25 * drawSettings.buttonRadius + 2 * 0.5 * drawSettings.nodePadding,
		)
		.attr('fill', 'blue')
		.attr('fill-opacity', '0.1')
		.on('click', (_e, i) => onLift(i));
}
/**
 * Adds node labels to all groups with id .nodes (generated by renderNodes)
 * Assumes data is already bound.
 */
export function renderNodeLabels(svgElement: Element, drawSettings: DrawSettingsInterface) {
	if (drawSettings.showNodeLabels) {
		const fontsize = 10;
		(
			d3.select(svgElement).selectAll('g.nodes') as d3.Selection<
				SVGElement,
				GraphDataNode,
				Element,
				undefined
			>
		)
			.append('text')
			.text(d => d.id)
			.attr('text-anchor', 'middle')
			.attr('dominant-baseline', 'middle')
			.attr('fill', 'black')
			.attr('font-size', `${fontsize}px`)
			.attr('y', d => -0.5 * d.height! + 1.333 * fontsize);
	} else {
		d3.select(svgElement).selectAll('g.nodes text').remove();
	}
}
/**
 * Updates node positions. Assumes data is already bound.
 * @param svgElement
 */

export function updateNodePosition(node: GraphDataNode, svgElement: Element) {
	(
		d3.select(svgElement).selectAll(`#group-${toHTMLToken(node.id)}`) as d3.Selection<
			d3.BaseType,
			GraphDataNode,
			Element,
			unknown
		>
	).attr('transform', n => `translate(${n.x} ${n.y})`);
}
/**
 * Render given nodes onto given svgElement.
 * Can only be used for initial drawing! Use updateNodePosition for rerendering.
 */
export function renderNodes(
	nodes: GraphDataNode[],
	svgElement: Element,
	drawSettings: DrawSettingsInterface,
) {
	if (nodes.length === 0) return;

	const nodeSelection = d3
		.select(svgElement)
		.selectAll(':scope > g.nodes')
		.data(nodes)
		.join('g')
		.attr('class', 'nodes')
		.attr('id', n => `group-${toHTMLToken(n.id)}`)
		.attr('transform', function (n) {
			return `translate(${n.x} ${n.y})`;
		});

	const rectangle = nodeSelection.select('rect.node').node()
		? (nodeSelection.select('rect.node') as d3.Selection<
				SVGRectElement,
				GraphDataNode,
				Element,
				unknown
		  >)
		: nodeSelection.append('rect');

	rectangle
		.attr('x', n => -0.5 * n.width!)
		.attr('y', n => -0.5 * n.height!)
		.attr('id', n => `rect-${toHTMLToken(n.id)}`)
		.attr('width', n => n.width!)
		.attr('height', n => n.height!)
		.attr(
			'fill',
			n =>
				drawSettings.nodeColors[drawSettings.colorFromBottom ? n.reverseLevel : n.level] ??
				drawSettings.nodeDefaultColor,
		)
		//.attr('fill', drawSettings.nodeColors[level] ?? drawSettings.nodeDefaultColor)
		.attr('fill-opacity', '0.1')
		.attr('rx', drawSettings.nodeCornerRadius)
		.attr('class', 'node')
		.on('mouseover', function (event, data) {
			d3.select(this).attr('fill-opacity', '0.2');
			data.outgoingLinks.forEach(link => {
				d3.select(`#line-${toHTMLToken(link.id)}`).style('stroke-width', '4');
			});
			data.incomingLinks.forEach(link => {
				// highlight
				d3.select(`#line-${toHTMLToken(link.id)}`).style('stroke-width', '4');
			});
		})
		.on('mouseout', function (event, data) {
			d3.select(this).attr('fill-opacity', '0.1');
			data.outgoingLinks.forEach(link => {
				d3.select(`#line-${toHTMLToken(link.id)}`).style('stroke-width', '1');
			});
			data.incomingLinks.forEach(link => {
				d3.select(`#line-${toHTMLToken(link.id)}`).style('stroke-width', '1');
			});
		});

	nodes.forEach(node => {
		const element = document.getElementById(`group-${toHTMLToken(node.id)}`)!;
		renderNodes(node.members, element, drawSettings);
	});
}

export function renderPorts(
	portMap: EdgePortMap,
	svgElement: Element,
	drawSettings: DrawSettingsInterface,
) {
	(
		d3.select(svgElement).selectAll('g.nodes') as d3.Selection<
			SVGGElement,
			GraphDataNode,
			Element,
			unknown
		>
	).each(function ({id, level, reverseLevel}) {
		d3.select(this)
			.selectAll('rect.port')
			.data(
				portMap[id].filter(({types}) => {
					for (const [edgeType, show] of drawSettings.shownEdgesType) {
						if (show && types.has(edgeType)) {
							return true;
						}
					}
					return false;
				}),
			)
			.join('rect')
			.attr('class', 'port')
			.attr('x', ({x, width}) => x - 0.5 * width)
			.attr('y', ({y, height}) => y - 0.5 * height)
			.attr('width', ({width}) => width)
			.attr('height', ({height}) => height)
			.attr(
				'fill',
				drawSettings.nodeColors[drawSettings.colorFromBottom ? reverseLevel : level] ??
					drawSettings.nodeDefaultColor,
			)
			.attr('fill-opacity', '0.3');
	});
}
