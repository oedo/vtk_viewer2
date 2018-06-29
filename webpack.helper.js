module.exports = function (config, data) {
    // Configure Babel
    config.module.rules.push({
        test: /\.js$/,
        include: data.pluginDir,
        loader: 'babel-loader?plugins[]=transform-class-properties'
    });

    // Configure rules for VTK.js:
    // See https://github.com/Kitware/vtk-js/blob/v7.3.2/Utilities/config/dependency.js
    config.module.rules.push({
        test: /\.glsl$/i,
        include: /node_modules(\/|\\)vtk\.js(\/|\\)/,
        loader: 'shader-loader'
    });
    config.module.rules.push({
        test: /\.js$/,
        include: /node_modules(\/|\\)vtk\.js(\/|\\)/,
        loader: 'babel-loader?presets[]=env'
    });
    config.module.rules.push({
        test: /\.worker\.js$/,
        include: /node_modules(\/|\\)vtk\.js(\/|\\)/,
        use: [
            {
                loader: 'worker-loader',
                options: { inline: true, fallback: false }
            }
        ]
    });
    return config;
};
