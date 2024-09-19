const { exec } = require('child_process');
const { promisify } = require('util');
const { Storage } = require('@google-cloud/storage');

const GALLERY_BUCKET_NAME = 'zinovik-gallery';
const HEDGEHOGS_BUCKET_NAME = 'hedgehogs';

// CHOOSE THE BUCKET
const BUCKET_NAME = GALLERY_BUCKET_NAME;
// const BUCKET_NAME = HEDGEHOGS_BUCKET_NAME;

//

const UPLOAD_BATCH_SIZE = 10;
const FILES_FILE_NAME = 'files.json';
const HEDGEHOGS_FILE_NAME = 'hedgehogs.json';
const PHOTOS_PATH = '/home/max/photos';
const HEDGEHOGS_BUCKET_FOLDER = 'photos';

const getFilename = (filePath) => filePath.split('/').pop();

const getFolderNameAndFilename = (filePath) => {
    const filePathParts = filePath.split('/');
    const folderName = filePathParts[filePathParts.length - 2];

    return [folderName, getFilename(filePath)];
};

const getFilenamesAndAccessesFromFile = async (bucket) => {
    const file = await bucket.file(FILES_FILE_NAME).download();

    return JSON.parse(file.toString()).map((file) => file.filename);
};

const getFilenamesFromHedgehogs = async (bucket) => {
    const file = await bucket.file(HEDGEHOGS_FILE_NAME).download();

    return JSON.parse(file.toString()).reduce(
        (acc, hedgehog) => [
            ...acc,
            ...hedgehog.photos.map((photoUrl) => getFilename(photoUrl)),
        ],
        []
    );
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
    for (let i = 0; i < filePaths.length; i += UPLOAD_BATCH_SIZE) {
        console.log(`- upload batch starting from ${i}`);
        const promises = filePaths
            .slice(i, i + UPLOAD_BATCH_SIZE)
            .map((filePath) => uploadFile(bucket, filePath, folder));

        await Promise.all(promises);
    }
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
    const filenamesFromJson = await (BUCKET_NAME === GALLERY_BUCKET_NAME
        ? getFilenamesAndAccessesFromFile(bucket)
        : getFilenamesFromHedgehogs(bucket));

    console.log('Get exiting filenames...');
    const exitingStorageFilePaths = await getExitingStorageFilePaths(bucket);
    const exitingStorageFilenames = exitingStorageFilePaths.map((filePath) =>
        getFilename(filePath)
    );

    console.log('Get all local file paths...');
    const allLocalFilePaths = await getAllLocalFilePaths(PHOTOS_PATH);

    const localFilePathsToUpload = mapFilenamesToLocalFilePaths(
        filterFilenames(filenamesFromJson, exitingStorageFilenames),
        allLocalFilePaths
    );
    console.log('Upload files...', localFilePathsToUpload);
    await uploadFiles(
        bucket,
        localFilePathsToUpload,
        BUCKET_NAME === GALLERY_BUCKET_NAME ? null : HEDGEHOGS_BUCKET_FOLDER
    );
})();