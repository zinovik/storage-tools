const { exec } = require('child_process');
const { promisify } = require('util');
const { Storage } = require('@google-cloud/storage');
const { performBatch } = require('./perform-batch');
const { BUCKET_NAME_FILES } = require('./constants');

const BUCKET_NAME_JSONS = 'zinovik-gallery';
const UPLOAD_BATCH_SIZE = 10;
const FILES_FILE_NAME = 'files.json';
const PHOTOS_PATH = '/home/max/photos';

const SKIP_UPLOAD_PATHS = [];

const getFilename = (filePath) => filePath.split('/').pop();

const getFolderNameAndFilename = (filePath) => {
    const filePathParts = filePath.split('/');
    const folderName = filePathParts[filePathParts.length - 2];

    return [folderName, getFilename(filePath)];
};

const getFilenamesFromFile = async (bucket) => {
    const file = await bucket.file(FILES_FILE_NAME).download();

    return JSON.parse(file.toString())
        .filter((file) =>
            SKIP_UPLOAD_PATHS.every(
                (path) =>
                    file.path !== path && !file.path.startsWith(`${path}/`)
            )
        )
        .map((file) => file.filename);
};

const getExitingStorageFilePaths = async (bucket) => {
    const [exitingFiles] = await bucket.getFiles();

    return exitingFiles.map((exitingFile) => exitingFile.name);
};

const getAllLocalFilePaths = async (filesPath) => {
    const { stdout: treeOutput } = await promisify(exec)(
        `find  ${filesPath} -type f`,
        { maxBuffer: 1024 * 1024 * 4 }
    );

    return treeOutput.split('\n');
};

const uploadFile = async (bucket, filePath, storageFolderName) => {
    const [storageFolderNameFromPath, fileName] =
        getFolderNameAndFilename(filePath);

    await bucket.upload(filePath, {
        destination: `${
            storageFolderName || storageFolderNameFromPath
        }/${fileName}`,
        public: false,
        metadata: {
            cacheControl: 'public, max-age=31536000',
        },
    });
};

const uploadFiles = async (bucket, filePaths, folder) => {
    await performBatch(
        filePaths,
        async (filePath) => await uploadFile(bucket, filePath, folder),
        UPLOAD_BATCH_SIZE,
        'upload files'
    );
};

const filterFilenames = (filenames, exitingFilenames) =>
    filenames.filter(
        (filenameFromJson) => !exitingFilenames.includes(filenameFromJson)
    );

const mapFilenamesToLocalFilePaths = (filenames, localFilePaths) =>
    filenames.map((filename) =>
        localFilePaths.find((localFilePath) => localFilePath.includes(filename))
    );

(async () => {
    const storageJsons = new Storage();
    const storageFiles = new Storage();
    const bucketJsons = storageJsons.bucket(BUCKET_NAME_JSONS);
    const bucketFiles = storageFiles.bucket(BUCKET_NAME_FILES);

    console.log('Get filenames from file...');
    const filenamesFromJson = await getFilenamesFromFile(bucketJsons);

    console.log('Get exiting filenames...');
    const exitingStorageFilePaths =
        await getExitingStorageFilePaths(bucketFiles);
    const exitingStorageFilenames = exitingStorageFilePaths.map((filePath) =>
        getFilename(filePath)
    );

    console.log('Get all local file paths...');
    const allLocalFilePaths = await getAllLocalFilePaths(PHOTOS_PATH);

    // TODO: Upload all local files?
    const localFilePathsToUpload = mapFilenamesToLocalFilePaths(
        filterFilenames(filenamesFromJson, exitingStorageFilenames),
        allLocalFilePaths
    );
    console.log('Upload files...', localFilePathsToUpload);
    await uploadFiles(bucketFiles, localFilePathsToUpload, null);
})();
