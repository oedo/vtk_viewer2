import { encode as base64encode } from 'base64-arraybuffer';

import vtkActor from 'vtk.js/Sources/Rendering/Core/Actor';
import vtkMapper from 'vtk.js/Sources/Rendering/Core/Mapper';
import vtkMtlReader from 'vtk.js/Sources/IO/Misc/MTLReader';
import vtkObjReader from 'vtk.js/Sources/IO/Misc/OBJReader';

//import GirderVtkReader from './GirderVtkReader';
const {GirderVtkReader}=require('./GirderVtkReader');

/**
 * Base class for readers of Wavefront OBJ files from Girder resources.
 * In their run() method, subclasses should first add model content using the following methods:
 * - addObjContent()
 * - addMtlContent()
 * - addImageContent()
 * Subclasses should then return buildPipeline();
 */
class GirderVtkObjReader extends GirderVtkReader {
    constructor() {
        super();

        // Storage for OBJ, MTL, and image resources
        this._data = { obj: {}, mtl: {}, image: {} };
    }

    /**
     * Add the content of an OBJ file.
     * @param {string} name - The name of the OBJ file.
     * @param {string} content - The content of the OBJ file.
     */
    addObjContent(name, content) {
        this._data.obj[name] = { content: content };
    }

    /**
     * Add the content of an MTL file.
     * @param {string} name - The name of the MTL file.
     * @param {string} content - The content of the MTL file.
     */
    addMtlContent(name, content) {
        this._data.mtl[name] = { content: content };
    }

    /**
     * Add the content of an image file.
     * @param {string} name - The name of the image file.
     * @param {string} content - The conten of the image file.
     */
    addImageContent(name, content) {
        this._data.image[name] = { content: content };
    }

    /**
     * Build the VTK pipeline to render the models.
     */
    async buildPipeline() {
        const data = this._data;

        this._readObjs(data.obj);
        this._readMtls(data.mtl);
        this._readImages(data.image);

        const mtlReaderByName = {};
        const imageLoaded = [];

        // Attach images to MTLs
        for (let info of Object.values(data.mtl)) {
            const mtlReader = info.reader;

            mtlReader.getMaterialNames().forEach((materialName) => {
                mtlReaderByName[materialName] = mtlReader;

                const material = mtlReader.getMaterial(materialName);
                if (material && material.image) {
                    const promise = new Promise((resolve, reject) => {
                        // Resolve on load and error
                        // FIXME: remove unfired event listener?
                        material.image.addEventListener('load', () => resolve(), {once: true});
                        material.image.addEventListener('error', () => resolve(), {once: true});
                    });
                    imageLoaded.push(promise);
                }
            });

            mtlReader.listImages().forEach((imageName) => {
                const image = data.image[imageName];
                if (image && image.inline) {
                    mtlReader.setImageSrc(imageName, image.inline);
                }
            });
        }

        // Wait for texture images to load. If rendering occurs before textures are loaded,
        // WebGL reports errors like:
        //     RENDER WARNING: there is no texture bound to the unit 0
        await Promise.all(imageLoaded);

        // Create VTK pipeline
        const actors = [];
        for (let info of Object.values(this._data.obj)) {
            const objReader = info.reader;
            const size = objReader.getNumberOfOutputPorts();
            for (let i = 0; i < size; i++) {
                const source = objReader.getOutputData(i);
                const mapper = vtkMapper.newInstance();
                const actor = vtkActor.newInstance();
                const name = source.get('name').name;
                const mtlReader = mtlReaderByName[name];

                actor.setMapper(mapper);
                mapper.setInputData(source);

                if (mtlReader && name) {
                    mtlReader.applyMaterialToActor(name, actor);
                }

                actors.push(actor);
            }
        }

        this.actors = actors;
    }

    /**
     * Read OBJ files using vtkObjReader.
     * @param {Object} data - Data object for OBJ files.
     */
    _readObjs(data) {
        for (let [name, info] of Object.entries(data)) {
            const objReader = vtkObjReader.newInstance({ splitMode: 'usemtl' });
            objReader.parseAsText(info.content);
            data[name].reader = objReader;
        }
    }

    /**
     * Read MTL files using vtkMtlReader.
     * @param {Object} data - Data object for MTL files.
     */
    _readMtls(data) {
        for (let [name, info] of Object.entries(data)) {
            const mtlReader = vtkMtlReader.newInstance();
            mtlReader.parseAsText(info.content);
            data[name].reader = mtlReader;
        }
    }

    /**
     * Read image files and store inline using a data URI.
     * @param {Object} data - Data object for image files.
     */
    _readImages(data) {
        for (let [name, info] of Object.entries(data)) {
            const ext = name.split('.').pop().toLowerCase();
            const base64Data = base64encode(info.content);
            data[name].inline = `data:image/${ext};base64,${base64Data}`;
        }
    }
}

//export default GirderVtkObjReader;
module.exports = { GirderVtkObjReader };
