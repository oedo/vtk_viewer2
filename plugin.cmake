add_standard_plugin_tests()

get_filename_component(_pluginName "${CMAKE_CURRENT_LIST_DIR}" NAME)
add_eslint_test(${_pluginName}_webpack "${_pluginDir}/webpack.helper.js")
