import 'babel-polyfill';

// Import widgets to extend base classes
import './views/HierarchyWidget';
import './views/ItemListWidget';

import GirderVtkReaderRegistry from './GirderVtkReaderRegistry';
import GirderVtkObjFolderReader from './GirderVtkObjFolderReader';
import GirderVtkObjItemReader from './GirderVtkObjItemReader';

// Registry readers
GirderVtkReaderRegistry.instance.addReader('obj', 'folder', GirderVtkObjFolderReader);
GirderVtkReaderRegistry.instance.addReader('obj', 'item', GirderVtkObjItemReader);
