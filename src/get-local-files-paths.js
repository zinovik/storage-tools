const fs = require('fs/promises');
const path = require('path');
const { PHOTOS_PATH } = require('./constants');

const getFilename = (filePath) => filePath.split('/').pop();

const getLocalFilesPaths = async () => {
    console.log('Get local files paths...');

    const entries = await fs.readdir(PHOTOS_PATH, {
        recursive: true,
        withFileTypes: true,
    });

    const result = entries
        .filter((entry) => entry.isFile())
        .map((entry) => path.join(entry.parentPath ?? entry.path, entry.name));

    return result;
};

const getLocalFilesNamesSet = async () => {
    const filesPaths = await getLocalFilesPaths();

    return new Set(filesPaths.map(getFilename));
};

module.exports = {
    getLocalFilesPaths,
    getLocalFilesNamesSet,
};
