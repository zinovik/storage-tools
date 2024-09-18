const { exec } = require('child_process');
const { promisify } = require('util');
const { Storage } = require('@google-cloud/storage');

const BUCKET_NAME = 'zinovik-gallery';

const RENAME_BATCH_SIZE = 20;
const PHOTOS_PATH = '/home/max/photos';

const getFilename = (filePath) => filePath.split('/').pop();

const getFolderNameAndFilename = (filePath) => {
    const filePathParts = filePath.split('/');
    const folderName = filePathParts[filePathParts.length - 2];

    return [folderName, getFilename(filePath)];
};

const getExitingStorageFilePaths = async (bucket) => {
    const [exitingFiles] = await bucket.getFiles();

    return exitingFiles.map((exitingFile) => exitingFile.name);
};

const getAllLocalFilePaths = async (filesPath) => {
    const { stdout: treeOutput } = await promisify(exec)(
        `tree ${filesPath} -f`,
        { maxBuffer: 1024 * 1024 * 4 }
    );

    return treeOutput
        .split('\n')
        .map((filePath) => filePath.substring(filePath.indexOf(filesPath)));
};

const getRenameFilePathPairs = (exitingStorageFilePaths, allLocalFilePaths) => {
    const filePathPairs = [];

    exitingStorageFilePaths.forEach((exitingStorageFilePath) => {
        const exitingStorageFilename = getFilename(exitingStorageFilePath);
        const localFilePath = allLocalFilePaths.find((localFilePath) =>
            localFilePath.includes(exitingStorageFilename)
        );

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
    for (let i = 0; i < renameFilenamesPairs.length; i += RENAME_BATCH_SIZE) {
        console.log(`- rename batch starting from ${i}`);
        const promises = renameFilenamesPairs
            .slice(i, i + RENAME_BATCH_SIZE)
            .map(([oldFilename, newFilename]) =>
                renameFile(bucket, oldFilename, newFilename)
            );

        await Promise.all(promises);
    }
};

(async () => {
    const storage = new Storage();
    const bucket = storage.bucket(BUCKET_NAME);

    console.log('Get exiting file paths...');
    const exitingStorageFilePaths = await getExitingStorageFilePaths(bucket);

    console.log('Get all local file paths...');
    const allLocalFilePaths = await getAllLocalFilePaths(PHOTOS_PATH);

    console.log('Rename files...');
    const renameFilePathPairs = getRenameFilePathPairs(
        exitingStorageFilePaths,
        allLocalFilePaths
    );
    await renameFiles(bucket, renameFilePathPairs);
})();
