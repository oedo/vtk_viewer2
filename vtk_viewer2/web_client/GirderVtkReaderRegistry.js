/**
 * Registry of classes that read 3D models supported by VTK.js.
 * Access the registry singleton through the 'instance' property.
 */
class GirderVtkReaderRegistry {
    // Singleton instance
    static _instance;

    /**
     * Singleton instance getter.
     */
    static get instance() {
        if (!GirderVtkReaderRegistry._instance) {
            GirderVtkReaderRegistry._instance = new GirderVtkReaderRegistry();
        }

        return GirderVtkReaderRegistry._instance;
    }

    constructor() {
        // Two-level map from model type -> resource -> class
        this._readerMap = new Map();
    }

    /**
     * Add a reader to the registry.
     * @param {string} modelType - The type of model that the reader supports.
     * @param {string} resourceType - The Girder resource type that the reader supports.
     * @param {class} readerClass - A GirderVtkReader class.
     */
    addReader(modelType, resourceType, readerClass) {
        modelType = modelType.toLowerCase();
        if (!this._readerMap.has(modelType)) {
            this._readerMap.set(modelType, new Map());
        }
        const resourceMap = this._readerMap.get(modelType);
        resourceMap.set(resourceType, readerClass);

        return this;
    }

    /**
     * Look up a reader in the registry.
     * @param {string} modelType - The type of model that the reader should support.
     * @param {string} resourceType - The Girder resource that the reader should support.
     * @returns {object} A new instance of a GirderVtkReader class, or null.
     */
    getReader(modelType, resourceType) {
        modelType = modelType.toLowerCase();
        const resourceMap = this._readerMap.get(modelType);
        if (!resourceMap) {
            return null;
        }

        const readerClass = resourceMap.get(resourceType);
        if (!readerClass) {
            return null;
        }

        return new readerClass(); // eslint-disable-line new-cap
    }

    /**
     * Check whether a reader for the given model type is registered.
     * @param {} modelType - The type of model that the reader should support.
     */
    hasReader(modelType) {
        modelType = modelType.toLowerCase();
        return this._readerMap.has(modelType);
    }
}

//export default GirderVtkReaderRegistry;
module.exports = { GirderVtkReaderRegistry };
