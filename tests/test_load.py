import pytest

from girder.plugin import loadedPlugins


@pytest.mark.plugin('vtk_viewer2')
def test_import(server):
    assert 'vtk_viewer2' in loadedPlugins()
