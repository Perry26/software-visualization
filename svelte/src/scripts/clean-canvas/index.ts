import * as d3 from 'd3';

export function cleanCanvas(svgElement: SVGElement) {
	// remove all the elements
	d3.select(svgElement).selectChildren().remove();
}

export default cleanCanvas;
