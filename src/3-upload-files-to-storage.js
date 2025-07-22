const { exec } = require('child_process');
const { promisify } = require('util');
const { Storage } = require('@google-cloud/storage');
const { performBatch } = require('./perform-batch');

const BUCKET_NAME = 'zinovik-gallery';
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

const uploadFile = async (bucket, filePath, storageFolderName, isPublic) => {
    const [storageFolderNameFromPath, fileName] =
        getFolderNameAndFilename(filePath);

    await bucket.upload(filePath, {
        destination: `${
            storageFolderName || storageFolderNameFromPath
        }/${fileName}`,
        public: isPublic,
        metadata: {
            cacheControl: 'public, max-age=31536000',
        },
    });
};

const uploadFiles = async (bucket, filePaths, folder, isPublic) => {
    await performBatch(
        filePaths,
        async (filePath) =>
            await uploadFile(bucket, filePath, folder, isPublic),
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
    const storage = new Storage();
    const bucket = storage.bucket(BUCKET_NAME);

    console.log('Get filenames from file...');
    const filenamesFromJson = await getFilenamesFromFile(bucket);

    console.log('Get exiting filenames...');
    const exitingStorageFilePaths = await getExitingStorageFilePaths(bucket);
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
    await uploadFiles(bucket, localFilePathsToUpload, null, false);
})();
