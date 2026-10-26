const { Storage } = require('@google-cloud/storage');
const { performBatch } = require('./perform-batch');
const { BUCKET_NAME_FILES } = require('./constants');
const { getLocalFilesPaths } = require('./get-local-files-paths');
const {
    getStorageExitingFilesPaths,
} = require('./get-storage-existing-files-paths');

const RENAME_BATCH_SIZE = 20;

const getFilename = (filePath) => filePath.split('/').pop();

const getFolderNameAndFilename = (filePath) => {
    const filePathParts = filePath.split('/');
    const folderName = filePathParts[filePathParts.length - 2];

    return [folderName, getFilename(filePath)];
};

const getRenameFilePathPairs = (exitingStorageFilePaths, allLocalFilePaths) => {
    const filePathPairs = [];

    const localFilesMap = allLocalFilePaths.reduce((acc, localFilePath) => {
        const localFilename = getFilename(localFilePath);
        acc[localFilename] = localFilePath;

        return acc;
    }, {});

    exitingStorageFilePaths.forEach((exitingStorageFilePath) => {
        const exitingStorageFilename = getFilename(exitingStorageFilePath);
        const localFilePath = localFilesMap[exitingStorageFilename];

        if (!localFilePath) return;

        const newStorageFilePath =
            getFolderNameAndFilename(localFilePath).join('/');

        if (exitingStorageFilePath === newStorageFilePath) return;

        filePathPairs.push([exitingStorageFilePath, newStorageFilePath]);
    });

    return filePathPairs;
};

const renameFile = async (bucket, oldFilePath, newFilePath) => {
    const oldFile = bucket.file(oldFilePath);
    const newFile = bucket.file(newFilePath);

    await oldFile.copy(newFile);
    await oldFile.delete();

    console.log(`Renamed ${oldFilePath} to ${newFilePath}`);
};

const renameFiles = async (bucket, renameFilenamesPairs) => {
    await performBatch(
        renameFilenamesPairs,
        async ([oldFilename, newFilename]) =>
            await renameFile(bucket, oldFilename, newFilename),
        RENAME_BATCH_SIZE,
        'rename files'
    );
};

(async () => {
    const storage = new Storage();
    const bucket = storage.bucket(BUCKET_NAME_FILES);

    const allLocalFilePaths = await getLocalFilesPaths();

    const storageExistingFilesPaths = await getStorageExitingFilesPaths(bucket);

    const renameFilePathPairs = getRenameFilePathPairs(
        storageExistingFilesPaths,
        allLocalFilePaths
    );

    if (renameFilePathPairs.length === 0) {
        console.log('No files to rename.');
        return;
    }

    console.log('Rename files...');
    console.time('Rename files');
    await renameFiles(bucket, renameFilePathPairs);
    console.timeEnd('Rename files');
})();
