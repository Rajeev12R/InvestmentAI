import { buildEvidenceGraph } from "../tools/evidence.tool.js";

export const evidenceNode = async (state) => {
    console.log("Running Evidence & Truth Layer Node");
    const { truthPackage, provenance, confidence } = buildEvidenceGraph(state);

    return {
        truthPackage,
        provenance,
        confidence
    };
};
