const path = require('path');
const fs = require('fs');
const package = require('./package.json');
const nodeModules = {};
Object.keys(package.dependencies).forEach(mod => {
	nodeModules[mod] = 'commonjs ' + mod;
});

module.exports = {
	entry: './src/index.ts',
	mode: 'production',
	target: 'node',
	module: {
		rules: [
			{
				test: /\.tsx?$/,
				use: 'ts-loader',
			},
		],
	},
	resolve: {
		extensions: ['.tsx', '.ts', '.js'],
	},
	output: {
		filename: 'core.js',
		path: path.resolve(__dirname, 'dist'),
		libraryTarget: 'commonjs',
	},
	externals: nodeModules,
};
