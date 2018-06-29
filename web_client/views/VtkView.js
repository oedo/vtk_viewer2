import events from 'girder/events';
import View from 'girder/views/View';

import macro from 'vtk.js/Sources/macro';
import vtkOpenGLRenderWindow from 'vtk.js/Sources/Rendering/OpenGL/RenderWindow';
import vtkRenderer from 'vtk.js/Sources/Rendering/Core/Renderer';
import vtkRenderWindow from 'vtk.js/Sources/Rendering/Core/RenderWindow';
import vtkRenderWindowInteractor from 'vtk.js/Sources/Rendering/Core/RenderWindowInteractor';

import GirderVtkReaderRegistry from '../GirderVtkReaderRegistry';
import template from '../templates/vtkView.pug';
import '../stylesheets/vtkView.styl';

/**
 * View to display models using VTK.js.
 *
 * @param {Array[]} settings.background - Array of 3 floats specifying RGB background.
 */
const VtkView = View.extend({
    initialize: function (settings) {
        this._background = settings.background || [0.32, 0.34, 0.43];

        this._renderWindow = null;
        this._renderer = null;
        this._glWindow = null;
        this._interactor = null;

        // Map of item ID to list of actors
        this._actors = new Map();
    },

    render: function () {
        this.$el.html(template());

        const container = this._container();

        this._renderWindow = vtkRenderWindow.newInstance();
        this._renderer = vtkRenderer.newInstance({
            background: this._background
        });
        this._renderWindow.addRenderer(this._renderer);

        this._glWindow = vtkOpenGLRenderWindow.newInstance();
        this._glWindow.setContainer(container[0]);
        this._renderWindow.addView(this._glWindow);
        this._glWindow.setSize(container.width(), container.height());

        this._interactor = vtkRenderWindowInteractor.newInstance();
        this._interactor.setView(this._glWindow);
        this._interactor.initialize();
        this._interactor.bindEvents(container[0]);

        return this;
    },

    destroy: function () {
        if (this.renderWindow) {
            this._renderWindow.removeView(this._glWindow);
            this._glWindow.setContainer(null);
            this._renderWindow.removeRenderer(this._renderer);
            this._interactor = null;
            this._glWindow = null;
            this._renderer = null;
            this._renderWindow = null;
        }

        View.prototype.destroy.call(this);
    },

    _container: function () {
        return this.$('.g-vtk-view-container');
    },

    _progressContainer: function () {
        return this.$('.g-vtk-view-progress-container');
    },

    _onProgress: function (item, bytesLoaded) {
        const container = this._progressContainer();
        if (bytesLoaded > 0) {
            container.text(`Loading ${item.name()}... ${macro.formatBytesToProperUnit(bytesLoaded)}`);
        } else {
            container.removeClass('g-vtk-view-progress-complete').addClass('g-vtk-view-progress-loading');
            container.text(`Loading ${item.name()}...`);
        }
    },

    _clearProgress: function () {
        this._progressContainer().addClass('g-vtk-view-progress-complete');
    },

    /**
     * Add a 3D model item to the view.
     * @param {ItemModel} item - The item to add to the view.
     * @param {string} modelType - The type of the model, e.g. 'obj'
     * @returns {bool} True if item was added to the view.
     */
    addItem: async function (item, modelType) {
        if (this._actors.has(item.id)) {
            return false;
        }

        // Initialize progress indicator
        this._onProgress(item, 0);

        // Look up appropriate reader
        const files = await item.getFiles();
        const resourceType = (files.length === 1) ? 'folder' : 'item';
        const reader = GirderVtkReaderRegistry.instance.getReader(modelType, resourceType);
        if (!reader) {
            this._clearProgress();
            throw new Error(`No reader found for model type '${modelType}' and resource type '${resourceType}'`);
        }

        try {
            // Set progress callback
            reader.progressCallback = (item, bytesLoaded) => { this._onProgress(item, bytesLoaded); };

            // Read item
            reader.item = item;
            await reader.run();
            const actors = reader.actors;
            if (actors.length === 0) {
                return false;
            }

            // Add actors to scene
            const emptyScene = this._actors.size === 0;
            actors.forEach((actor) => this._renderer.addActor(actor));
            if (emptyScene) {
                this._renderer.resetCamera();
            }
            this._renderWindow.render();

            this._actors.set(item.id, actors);
        } catch (err) {
            events.trigger('g:alert', {
                icon: 'cancel',
                text: `Error loading model (${err})`,
                type: 'danger',
                timeout: 4000
            });
        } finally {
            // Clear progress indicator
            this._clearProgress();
        }

        return true;
    },

    /**
     * Remove a 3D model item from the view.
     * @param {ItemModel} item - The item to remove from the view.
     */
    removeItem: function (item) {
        const actors = this._actors.get(item.id);
        this._actors.delete(item.id);

        actors.forEach((actor) => this._renderer.removeActor(actor));

        this._renderWindow.render();
    }
});

export default VtkView;
