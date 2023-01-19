import ItemListWidget from 'girder/views/widgets/ItemListWidget';

// Add "View in browser" click event handler
ItemListWidget.prototype.events['click a.g-view-inline'] = function (event) {
    // Get item
    const target = $(event.currentTarget);
    const cid = target.siblings('[g-item-cid]').first().attr('g-item-cid');
    const item = this.collection.get(cid);

    // Trigger event
    this.trigger('g:viewItemClicked', item, event);
};
