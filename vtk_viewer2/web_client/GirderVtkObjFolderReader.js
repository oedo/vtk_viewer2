//import { restRequest } from 'girder/rest';
const {restRequest}=require('girder/rest');

//import GirderVtkObjReader from './GirderVtkObjReader';
const {GirderVtkObjReader}=require('./GirderVtkObjReader');

/**
 * Class to read a Wavefront OBJ file, along with any associated MTL files
 * and texture images, from a Girder folder.
 */
class GirderVtkObjFolderReader extends GirderVtkObjReader {
    async run() {
        const item = this.item;
        if (!item) {
            throw new Error('No item set');
        }

        // Fetch OBJ file content
        const objContent = await this._fetchObjFileContent(item);

        // Look up items corresponding to MTL file names
        let mtlFileNames = this._parseMtlFileNames(objContent);
        mtlFileNames = [...new Set(mtlFileNames)];
        const folderId = item.get('folderId');
        let mtlItems = await this._fetchItemsInFolder(folderId, mtlFileNames);
        mtlItems = mtlItems.filter((item) => item);

        // Fetch MTL file content
        let mtlContent = await this._fetchMtlFileContent(mtlItems);

        // Look up items corresponding to image file names
        let imageFileNames = this._parseImageFileNames(mtlContent);
        imageFileNames = [...new Set(imageFileNames)];
        let imageItems = await this._fetchItemsInFolder(folderId, imageFileNames);
        imageItems = imageItems.filter((item) => item);

        // Fetch image file content
        let imageContent = await this._fetchImageFileContent(imageItems);

        // Add model content
        this.addObjContent(item.name(), objContent);
        mtlItems.forEach((mtlItem, index) => {
            this.addMtlContent(mtlItem.name, mtlContent[index]);
        });
        imageItems.forEach((imageItem, index) => {
            this.addImageContent(imageItem.name, imageContent[index]);
        });

        // Build VTK pipeline
        return this.buildPipeline();
    }

    /**
     * Fetch file content for an item with a single file.
     * @param {ItemModel} item - The item whose file to fetch.
     */
    _fetchObjFileContent(item) {
        return restRequest({
            url: `${item.resourceName}/${item.id}/download`,
            xhrFields: {
                onprogress: (event) => { this.onProgress(event); }
            }
        });
    }

    /**
     * Parse MTL file names in the content of an OBJ file.
     * @param {string} content - The content of an OBJ file.
     * @returns {string[]} A list of the MTL file names.
     */
    _parseMtlFileNames(content) {
        const mtlFileNames = [];
        const re = /^mtllib\s+(.*)$/;
        content.split('\n').forEach((line) => {
            const result = line.trim().match(re);
            if (result !== null && result.length > 1) {
                mtlFileNames.push(result[1]);
            }
        });
        return mtlFileNames;
    }

    /**
     * Fetch items in the specified folder by name.
     * @param {string} folderId - The ID of the folder.
     * @param {string[]} fileNames - The list of file names to search for.
     * @returns {Object[]} The fetched items; may contain nulls for items that weren't found.
     */
    async _fetchItemsInFolder(folderId, fileNames) {
        const requests = fileNames.map((fileName) => {
            return restRequest({
                url: 'item',
                data: {
                    folderId: folderId,
                    name: fileName
                }
            });
        });

        const responses = await Promise.all(requests);
        return responses.map((resp) => resp[0]);
    }

    /**
     * Fetch file content for MTL files.
     * @param {Object[]} items - The list of items to fetch.
     * @returns {Promise} Promise resolving to list of file content strings.
     */
    _fetchMtlFileContent(items) {
        const requests = items.map((item) => {
            return restRequest({
                url: `item/${item._id}/download`,
                xhrFields: {
                    onprogress: (event) => { this.onProgress(event); }
                }
            });
        });

        return Promise.all(requests);
    }

    /**
     * Parse image file names in the content of MTL files.
     * @param {string[]} mtlContent - A list of the content of MTL files.
     * @returns {string[]} A list of the image file names.
     */
    _parseImageFileNames(mtlContent) {
        const fileNames = [];
        const re = /^map_\w+\s+(.*)$/;
        mtlContent.forEach((content) => {
            content.split('\n').forEach((line) => {
                const result = line.trim().match(re);
                if (result !== null && result.length > 1) {
                    fileNames.push(result[1]);
                }
            });
        });
        return fileNames;
    }

    /**
     * Fetch file content for image files.
     * @param {Object[]} items - The list of items to fetch.
     * @returns {Promise} Promise resolving to list of file content ArrayBuffers.
     */
    _fetchImageFileContent(items) {
        const requests = items.map((item) => {
            return restRequest({
                url: `item/${item._id}/download`,
                xhrFields: {
                    responseType: 'arraybuffer',
                    onprogress: (event) => { this.onProgress(event); }
                }
            });
        });

        return Promise.all(requests);
    }
}

//export default GirderVtkObjFolderReader;
module.exports = { GirderVtkObjFolderReader };
