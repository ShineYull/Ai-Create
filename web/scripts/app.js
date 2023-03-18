import { AiCreateUI } from "./ui.js";

class AiCreateApp {
    constructor() {
		this.ui = new AiCreateUI(this);
		this.extensions = [];
		this.nodeOutputs = {};
	}

    /**
	 * Set up the app on the page
	 */
	setup() {
		var graph = new LGraph();

		var canvas = new LGraphCanvas("#mycanvas", graph);

		var node_const = LiteGraph.createNode("basic/const");
		node_const.pos = [200,200];
		graph.add(node_const);
		node_const.setValue(4.5);

		var node_watch = LiteGraph.createNode("basic/watch");
		node_watch.pos = [700,200];
		graph.add(node_watch);

		node_const.connect(0, node_watch, 0 );

		graph.start();
	}
}

export const app = new AiCreateApp();