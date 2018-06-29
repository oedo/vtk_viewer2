import JSZip from 'jszip';

import { restRequest } from 'girder/rest';

import GirderVtkObjReader from './GirderVtkObjReader';

/**
 * Class to read Wavefront OBJ files, along with any associated MTL files
 * and texture images, from a Girder item.
 */
class GirderVtkObjItemReader extends GirderVtkObjReader {
    async run() {
        const item = this.item;
        if (!item) {
            throw new Error('No item set');
        }

        // Fetch item content as ZIP file and uncompress
        const zipData = await this._fetchItemContent(item);
        const zip = await JSZip.loadAsync(zipData);
        await this._extractZip(zip);

        // Build VTK pipeline
        return this.buildPipeline();
    }

    /**
     * Fetch content for an item with multiple files.
     * The server streams a ZIP file containing the item's files in which
     * all files are in a directory named after the item.
     * @param {ItemModel} item - The item whose files to fetch.
     */
    _fetchItemContent(item) {
        return restRequest({
            url: `${item.resourceName}/${item.id}/download`,
            xhrFields: {
                responseType: 'arraybuffer',
                onprogress: (event) => { this.onProgress(event); }
            }
        });
    }

    /**
     * Extract OBJ, MTL, and image files from a ZIP file and add the
     * extracted model content using methods on the base class.
     * @param {JSZip} zip - The JSZip object to extract.
     */
    async _extractZip(zip) {
        const fileInfo = [];
        const promises = [];
        zip.forEach((relativePath, zipEntry) => {
            if (relativePath.match(/\.obj$/i)) {
                fileInfo.push({
                    type: 'obj',
                    path: relativePath
                });
                promises.push(zipEntry.async('string'));
            } else if (relativePath.match(/\.mtl$/i)) {
                fileInfo.push({
                    type: 'mtl',
                    path: relativePath
                });
                promises.push(zipEntry.async('string'));
            } else if (relativePath.match(/\.jpg|jpeg|png$/i)) {
                fileInfo.push({
                    type: 'image',
                    path: relativePath
                });
                promises.push(zipEntry.async('arraybuffer'));
            }
        });

        // Add model content
        const fileContents = await Promise.all(promises);
        fileContents.forEach((content, index) => {
            const info = fileInfo[index];
            const fileName = this._basename(info.path);
            switch (info.type) {
                case 'obj':
                    this.addObjContent(fileName, content);
                    break;
                case 'mtl':
                    this.addMtlContent(fileName, content);
                    break;
                case 'image':
                    this.addImageContent(fileName, content);
                    break;
                default:
                    break;
            }
        });
    }

    /**
     * Get the filename given a full path.
     * @param {string} path - The full path of a file.
     */
    _basename(path) {
        const parts = path.split('/');
        return parts.pop();
    }
}

export default GirderVtkObjItemReader;
