class AiCreateApi extends EventTarget {
	constructor() {
		super();
	}

	/**
	 * Loads node object definitions for the graph
	 * @returns The node definitions
	 */
	async getNodeDefs() {
		const resp = await fetch("object_info", { cache: "no-store" });
		return await resp.json();
	}
}

export const api = new AiCreateApi();