import {AiCreateWidgets} from "./widgets.js"
import { AiCreateUI } from "./ui.js";
import { api } from "./api.js";

class AiCreateApp {
    constructor() {
		this.ui = new AiCreateUI(this);
		this.extensions = [];
		this.nodeOutputs = {};
	}

	/**
	 * Adds Custom drawing logic for nodes
	 * e.g. Draws images and handles thumbnail navigation on nodes that output images
	 * @param {*} node The node to add the draw handler
	 */
	#addDrawBackgroundHandler(node) {
		const app = this;
		node.prototype.onDrawBackground = function (ctx) {
			if (!this.flags.collapsed) {
				const output = app.nodeOutputs[this.id + ""];
				if (output && output.images) {
					if (this.images !== output.images) {
						this.images = output.images;
						this.imgs = null;
						this.imageIndex = null;
						Promise.all(
							output.images.map((src) => {
								return new Promise((r) => {
									const img = new Image();
									img.onload = () => r(img);
									img.onerror = () => r(null);
									img.src = "/view/" + src;
								});
							})
						).then((imgs) => {
							if (this.images === output.images) {
								this.imgs = imgs.filter(Boolean);
								if (this.size[1] < 100) {
									this.size[1] = 250;
								}
								app.graph.setDirtyCanvas(true);
							}
						});
					}
				}

				if (this.imgs && this.imgs.length) {
					const canvas = graph.list_of_graphcanvas[0];
					const mouse = canvas.graph_mouse;
					if (!canvas.pointer_is_down && this.pointerDown) {
						if (mouse[0] === this.pointerDown.pos[0] && mouse[1] === this.pointerDown.pos[1]) {
							this.imageIndex = this.pointerDown.index;
						}
						this.pointerDown = null;
					}

					let w = this.imgs[0].naturalWidth;
					let h = this.imgs[0].naturalHeight;
					let imageIndex = this.imageIndex;
					const numImages = this.imgs.length;
					if (numImages === 1 && !imageIndex) {
						this.imageIndex = imageIndex = 0;
					}

					let shiftY;
					if (this.imageOffset != null) {
						shiftY = this.imageOffset;
					} else {
						shiftY = this.computeSize()[1];
					}

					let dw = this.size[0];
					let dh = this.size[1];
					dh -= shiftY;

					if (imageIndex == null) {
						let best = 0;
						let cellWidth;
						let cellHeight;
						let cols = 0;
						let shiftX = 0;
						for (let c = 1; c <= numImages; c++) {
							const rows = Math.ceil(numImages / c);
							const cW = dw / c;
							const cH = dh / rows;
							const scaleX = cW / w;
							const scaleY = cH / h;

							const scale = Math.min(scaleX, scaleY, 1);
							const imageW = w * scale;
							const imageH = h * scale;
							const area = imageW * imageH * numImages;

							if (area > best) {
								best = area;
								cellWidth = imageW;
								cellHeight = imageH;
								cols = c;
								shiftX = c * ((cW - imageW) / 2);
							}
						}

						let anyHovered = false;
						this.imageRects = [];
						for (let i = 0; i < numImages; i++) {
							const img = this.imgs[i];
							const row = Math.floor(i / cols);
							const col = i % cols;
							const x = col * cellWidth + shiftX;
							const y = row * cellHeight + shiftY;
							if (!anyHovered) {
								anyHovered = LiteGraph.isInsideRectangle(
									mouse[0],
									mouse[1],
									x + this.pos[0],
									y + this.pos[1],
									cellWidth,
									cellHeight
								);
								if (anyHovered) {
									this.overIndex = i;
									let value = 110;
									if (canvas.pointer_is_down) {
										if (!this.pointerDown || this.pointerDown.index !== i) {
											this.pointerDown = { index: i, pos: [...mouse] };
										}
										value = 125;
									}
									ctx.filter = `contrast(${value}%) brightness(${value}%)`;
									canvas.canvas.style.cursor = "pointer";
								}
							}
							this.imageRects.push([x, y, cellWidth, cellHeight]);
							ctx.drawImage(img, x, y, cellWidth, cellHeight);
							ctx.filter = "none";
						}

						if (!anyHovered) {
							this.pointerDown = null;
							this.overIndex = null;
						}
					} else {
						// Draw individual
						const scaleX = dw / w;
						const scaleY = dh / h;
						const scale = Math.min(scaleX, scaleY, 1);

						w *= scale;
						h *= scale;

						let x = (dw - w) / 2;
						let y = (dh - h) / 2 + shiftY;
						ctx.drawImage(this.imgs[imageIndex], x, y, w, h);

						const drawButton = (x, y, sz, text) => {
							const hovered = LiteGraph.isInsideRectangle(mouse[0], mouse[1], x + this.pos[0], y + this.pos[1], sz, sz);
							let fill = "#333";
							let textFill = "#fff";
							let isClicking = false;
							if (hovered) {
								canvas.canvas.style.cursor = "pointer";
								if (canvas.pointer_is_down) {
									fill = "#1e90ff";
									isClicking = true;
								} else {
									fill = "#eee";
									textFill = "#000";
								}
							} else {
								this.pointerWasDown = null;
							}

							ctx.fillStyle = fill;
							ctx.beginPath();
							ctx.roundRect(x, y, sz, sz, [4]);
							ctx.fill();
							ctx.fillStyle = textFill;
							ctx.font = "12px Arial";
							ctx.textAlign = "center";
							ctx.fillText(text, x + 15, y + 20);

							return isClicking;
						};

						if (numImages > 1) {
							if (drawButton(x + w - 35, y + h - 35, 30, `${this.imageIndex + 1}/${numImages}`)) {
								let i = this.imageIndex + 1 >= numImages ? 0 : this.imageIndex + 1;
								if (!this.pointerDown || !this.pointerDown.index === i) {
									this.pointerDown = { index: i, pos: [...mouse] };
								}
							}

							if (drawButton(x + w - 35, y + 5, 30, `x`)) {
								if (!this.pointerDown || !this.pointerDown.index === null) {
									this.pointerDown = { index: null, pos: [...mouse] };
								}
							}
						}
					}
				}
			}
		};
	}

	/**
	 * Adds special context menu handling for nodes
	 * e.g. this adds Open Image functionality for nodes that show images
	 * @param {*} node The node to add the menu handler
	 */
	#addNodeContextMenuHandler(node) {
		node.prototype.getExtraMenuOptions = function (_, options) {
			if (this.imgs) {
				// If this node has images then we add an open in new tab item
				let img;
				if (this.imageIndex != null) {
					// An image is selected so select that
					img = this.imgs[this.imageIndex];
				} else if (this.overIndex != null) {
					// No image is selected but one is hovered
					img = this.imgs[this.overIndex];
				}
				if (img) {
					options.unshift({
						content: "Open Image",
						callback: () => window.open(img.src, "_blank"),
					});
				}
			}
		};
	}

	/**
	 * Invoke an async extension callback
	 * Each callback will be invoked concurrently
	 * @param {string} method The extension callback to execute
	 * @param  {...any} args Any arguments to pass to the callback
	 * @returns
	 */
	async #invokeExtensionsAsync(method, ...args) {
		return await Promise.all(
			this.extensions.map(async (ext) => {
				if (method in ext) {
					try {
						return await ext[method](...args, this);
					} catch (error) {
						console.error(
							`Error calling extension '${ext.name}' method '${method}'`,
							{ error },
							{ extension: ext },
							{ args }
						);
					}
				}
			})
		);
	}

	/**
	 * Registers nodes with the graph
	 */
	async registerNodes() {
		const app = this;
		// Load node definitions from the backend
		const defs = await api.getNodeDefs();
		await this.#invokeExtensionsAsync("addCustomNodeDefs", defs);

		// Generate list of known widgets
		const widgets = Object.assign(
			{},
			AiCreateWidgets,
			...(await this.#invokeExtensionsAsync("getCustomWidgets")).filter(Boolean)
		);

		// Register a node for each definition
		for (const nodeId in defs) {
			const nodeData = defs[nodeId];
			const node = Object.assign(
				function ComfyNode() {
					const inputs = nodeData["input"]["required"];
					const config = { minWidth: 1, minHeight: 1 };
					for (const inputName in inputs) {
						const inputData = inputs[inputName];
						const type = inputData[0];

						if (Array.isArray(type)) {
							// Enums e.g. latent rotation
							let defaultValue = type[0];
							if (inputData[1] && inputData[1].default) {
								defaultValue = inputData[1].default;
							}
							this.addWidget("combo", inputName, defaultValue, () => {}, { values: type });
						} else if (`${type}:${inputName}` in widgets) {
							// Support custom widgets by Type:Name
							Object.assign(config, widgets[`${type}:${inputName}`](this, inputName, inputData, app) || {});
						} else if (type in widgets) {
							// Standard type widgets
							Object.assign(config, widgets[type](this, inputName, inputData, app) || {});
						} else {
							// Node connection inputs
							this.addInput(inputName, type);
						}
					}

					for (const output of nodeData["output"]) {
						this.addOutput(output, output);
					}

					const s = this.computeSize();
					s[0] = Math.max(config.minWidth, s[0] * 1.5);
					s[1] = Math.max(config.minHeight, s[1]);
					this.size = s;
					this.serialize_widgets = true;

					app.#invokeExtensionsAsync("nodeCreated", this);
				},
				{
					title: nodeData.name,
					comfyClass: nodeData.name,
				}
			);
			node.prototype.comfyClass = nodeData.name;

			this.#addNodeContextMenuHandler(node);
			this.#addDrawBackgroundHandler(node, app);

			await this.#invokeExtensionsAsync("beforeRegisterNodeDef", node, nodeData);
			LiteGraph.registerNodeType(nodeId, node);
			node.category = nodeData.category;
		}

		await this.#invokeExtensionsAsync("registerCustomNodes");
	}

    /**
	 * Set up the app on the page
	 */
	async setup() {
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

		await this.#invokeExtensionsAsync("init");
		await this.registerNodes();
	}
}

export const app = new AiCreateApp();