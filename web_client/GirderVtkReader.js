/**
 * Base class for classes that read 3D models supported by VTK.js.
 */
class GirderVtkReader {
    constructor() {
        this._item = null;
        this._actors = [];
        this._currentBytesLoaded = 0;
        this._totalBytesLoaded = 0;
        this._progressCallback = null;
    }

    get item() {
        return this._item;
    }

    set item(item) {
        this._item = item;
    }

    get actors() {
        return this._actors;
    }

    set actors(actors) {
        this._actors = actors;
    }

    /**
     * Set a progress callback for file transfers. The callback should take two arguments:
     * - item: The item being read.
     * - bytesLoaded: The total number of bytes transferred.
     */
    set progressCallback(val) {
        this._progressCallback = val;
    }

    /**
     * Run the reader.
     * Requires item to be set.
     * Following successful execution, the actors added for the item are available via the
     * 'actors' property.
     */
    run() {
        // Implement in subclass
        throw new Error('Internal error');
    }

    /**
     * Handler for a progress event. Subclasses should attach progress handlers to this method
     * to ensure that progress updates propagate to the progress callback.
     * @param {ProgressEvent} event - The progress event.
     */
    onProgress(event) {
        if (event.lengthComputable) {
            if (event.loaded === event.total) {
                this._totalBytesLoaded += event.total;
                this._currentBytesLoaded = 0;
            } else {
                this._currentBytesLoaded = event.loaded;
            }
        } else {
            this._totalBytesLoaded = event.loaded;
        }

        if (this._progressCallback) {
            this._progressCallback(this.item, this._totalBytesLoaded + this._currentBytesLoaded);
        }
    }
}

export default GirderVtkReader;
