import {EdgeType, type DrawSettingsInterface} from '$types';

const defaultDrawSettings: DrawSettingsInterface = {
	minimumNodeSize: 50,
	buttonRadius: 5,
	nodeCornerRadius: 5,
	nodePadding: 20,
	nodeMargin: {
		inner: 30,
		intermediate: 30,
		root: 30,
	},
	textSize: 10,
	shownEdgesType: new Map<EdgeType, boolean>(),
	showEdgeLabels: false,
	showNodeLabels: true,
	showNodeButtons: true,
	showEdgePorts: true,
	colorFromBottom: true,
	invertPortColors: false,
	nodeDefaultColor: '#6a6ade',
	nodeColors: ['#32a875', '#d46868'],
	innerLayout: 'layerTree',
	intermediateLayout: 'layerTree',
	rootLayout: 'layerTree',
	layoutSettings: {
		inner: {
			uniformSize: true,
			manyBodyForce: {
				type: 'Rectangular',
				strength: 30,
			},
			collideRectangles: true,
			centerForceStrength: {
				enabled: true,
				x: 0.1,
				y: 0.1,
			},
			linkForce: {
				enabled: true,
				distance: 30,
				strength: 1,
			},
		},
		intermediate: {
			uniformSize: true,
			manyBodyForce: {type: 'Rectangular', strength: 30},
			collideRectangles: true,
			centerForceStrength: {
				enabled: true,
				x: 0.1,
				y: 0.1,
			},
			linkForce: {
				enabled: true,
				distance: 30,
				strength: 1,
			},
		},
		root: {
			uniformSize: true,
			manyBodyForce: {
				type: 'Rectangular',
				strength: 30,
			},
			collideRectangles: true,
			centerForceStrength: {
				enabled: true,
				x: 0.1,
				y: 0.1,
			},
			linkForce: {
				enabled: true,
				distance: 30,
				strength: 1,
			},
		},
	},
};

export function makeDefaultDrawSettings(): DrawSettingsInterface {
	const settings = structuredClone(defaultDrawSettings);
	settings.shownEdgesType.set(EdgeType.calls, true);
	return settings;
}
