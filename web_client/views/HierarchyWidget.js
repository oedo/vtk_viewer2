import events from 'girder/events';
import HierarchyWidget from 'girder/views/widgets/HierarchyWidget';
import { confirm } from 'girder/dialog';
import { wrap } from 'girder/utilities/PluginUtils';

import GirderVtkReaderRegistry from '../GirderVtkReaderRegistry';
import VtkView from './VtkView';

wrap(HierarchyWidget, 'render', function (render) {
    // Call wrapped method
    render.call(this);

    if (this.itemListView && !this._vtkViewItemIds) {
        // Add member to track which items are shown in VTK view
        this._vtkViewItemIds = new Set();

        // Add member to track whether VTK view is loading a model
        this._vtkViewLoading = false;

        // Listen to event triggered when "View in browser" is clicked
        this.listenTo(this.itemListView, 'g:viewItemClicked', this._onViewItemClicked);
    }
    return this;
});

wrap(HierarchyWidget, 'setCurrentModel', function (setCurrentModel, parent, opts) {
    // Remove VTK view
    if (this._vtkView) {
        this._vtkView.$el.remove();
        this._vtkView.destroy();
        this._vtkView = null;
    }
    if (this._vtkViewItemIds) {
        this._vtkViewItemIds.clear();
    }

    // Call wrapped method
    setCurrentModel.call(this, parent, opts);
});

HierarchyWidget.prototype._onViewItemClicked = async function (item, event) {
    // Check whether model type is supported, using file extension
    // TODO: Consider determining whether item is a valid model by requiring specific metadata
    const parts = item.name().split('.');
    if (parts.length < 2) {
        return;
    }
    const extension = parts.pop();
    const modelType = extension.toLowerCase();
    if (!GirderVtkReaderRegistry.instance.hasReader(modelType)) {
        return;
    }

    event.preventDefault();

    // Add VTK view
    if (!this._vtkView) {
        this._addVtkView();
    }

    // Update displayed items
    if (this._vtkViewItemIds.has(item.id)) {
        this._setIconSelected(event, false);
        this._vtkView.removeItem(item);
        this._vtkViewItemIds.delete(item.id);
    } else {
        // Prevent loading multiple models simultaneously
        if (this._vtkViewLoading) {
            confirm({
                text: 'Please wait until the model finishes loading.',
                yesText: 'OK',
                yesClass: 'btn-primary'
            });
            return;
        }

        this._vtkViewLoading = true;
        this._setIconSelected(event, true);

        try {
            const addedItem = await this._vtkView.addItem(item, modelType);
            if (addedItem) {
                this._vtkViewItemIds.add(item.id);
            }
        } catch (err) {
            events.trigger('g:alert', {
                icon: 'cancel',
                text: err,
                type: 'danger',
                timeout: 4000
            });
        } finally {
            this._vtkViewLoading = false;
        }
    }
};

HierarchyWidget.prototype._addVtkView = function () {
    this._vtkView = new VtkView({
        parentView: this
    });
    this.$el.append(this._vtkView.$el);
    this._vtkView.render();
};

HierarchyWidget.prototype._setIconSelected = function (event, selected) {
    const icon = $(event.currentTarget).children('i');
    icon.toggleClass('g-vtk-view-item-selected', selected);
};
