const { Storage } = require('@google-cloud/storage');
const { performBatch } = require('./perform-batch');
const { BUCKET_NAME_FILES } = require('./constants');
const { getLocalFilesPaths } = require('./get-local-files-paths');
const {
    getStorageExitingFilesPaths,
} = require('./get-storage-existing-files-paths');

const UPLOAD_BATCH_SIZE = 10;

const getFilename = (filePath) => filePath.split('/').pop();

const getFolderNameAndFilename = (filePath) => {
    const filePathParts = filePath.split('/');
    const folderName = filePathParts[filePathParts.length - 2];

    return [folderName, getFilename(filePath)];
};

const uploadFile = async (bucket, filePath) => {
    const [storageFolderNameFromPath, fileName] =
        getFolderNameAndFilename(filePath);

    await bucket.upload(filePath, {
        destination: `${storageFolderNameFromPath}/${fileName}`,
        public: false,
        metadata: {
            cacheControl: 'public, max-age=31536000',
        },
    });
};

const uploadFiles = async (bucket, filePaths) => {
    await performBatch(
        filePaths,
        async (filePath) => await uploadFile(bucket, filePath),
        UPLOAD_BATCH_SIZE,
        'upload files'
    );
};

const filterFilePaths = (allLocalFilePaths, exitingStorageFilenamesSet) =>
    allLocalFilePaths.filter(
        (localFilePath) =>
            !exitingStorageFilenamesSet.has(getFilename(localFilePath))
    );

(async () => {
    const storage = new Storage();
    const bucket = storage.bucket(BUCKET_NAME_FILES);

    const allLocalFilePaths = await getLocalFilesPaths();

    const storageExistingFilesPaths = await getStorageExitingFilesPaths(bucket);

    console.log('Filtering local file paths...');
    console.time('Filtering local file paths');
    const localFilePathsToUpload = filterFilePaths(
        allLocalFilePaths,
        new Set(storageExistingFilesPaths.map(getFilename))
    );
    console.timeEnd('Filtering local file paths');

    if (localFilePathsToUpload.length === 0) {
        console.log('No new files to upload.');
        return;
    }

    console.log('Upload files...', localFilePathsToUpload);
    await uploadFiles(bucket, localFilePathsToUpload);
})();
