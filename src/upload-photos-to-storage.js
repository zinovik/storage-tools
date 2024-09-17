const { exec } = require('child_process');
const { promisify } = require('util');
const { Storage } = require('@google-cloud/storage');

const GALLERY_BUCKET_NAME = 'zinovik-gallery';
const HEDGEHOGS_BUCKET_NAME = 'hedgehogs';

// CHOOSE THE BUCKET
const BUCKET_NAME = GALLERY_BUCKET_NAME;
// const BUCKET_NAME = HEDGEHOGS_BUCKET_NAME;

//

const BATCH_SIZE = 10;
const FILES_FILE_NAME = 'files.json';
const HEDGEHOGS_FILE_NAME = 'hedgehogs.json';
const PHOTOS_PATH = '/home/max/photos';
const HEDGEHOGS_BUCKET_FOLDER = 'photos';

const FILES_TO_SAVE = [
    ...(BUCKET_NAME === GALLERY_BUCKET_NAME
        ? ['albums.json', FILES_FILE_NAME, 'sources-config.json', 'users.json']
        : []),
    ...(BUCKET_NAME === HEDGEHOGS_BUCKET_NAME ? [HEDGEHOGS_FILE_NAME] : []),
];

const getFilename = (filePath) => filePath.split('/').pop();

const getFolderNameAndFilename = (filePath) => {
    const filePathParts = filePath.split('/');
    const folderName = filePathParts[filePathParts.length - 2];

    return [folderName, getFilename(filePath)];
};

const removeUnrelatedFiles = async (bucket, filesToSave) => {
    const [exitingFiles] = await bucket.getFiles({ versions: true });

    const filesToRemove = exitingFiles
        .filter((file) => !filesToSave.includes(getFilename(file.name)))
        .map((file) =>
            bucket.file(file.name, {
                generation: file.generation,
            })
        );

    console.log(`Unrelated files to remove: ${filesToRemove.length}`);

    await Promise.all(filesToRemove.map((file) => file.delete()));
};

const filterNotCurrentVersions = (files) => {
    const currentVersionMap = {};

    files.forEach((file) => {
        if (
            !currentVersionMap[file.name] ||
            currentVersionMap[file.name] < file.generation
        )
            currentVersionMap[file.name] = file.generation;
    });

    return files.filter(
        (file) => file.generation !== currentVersionMap[file.name]
    );
};

const removeNotCurrentFiles = async (bucket) => {
    const [exitingFiles] = await bucket.getFiles({ versions: true });

    const filesToRemove = filterNotCurrentVersions(exitingFiles).map((file) =>
        bucket.file(file.name, {
            generation: file.generation,
        })
    );

    console.log(`Not current files to remove: ${filesToRemove.length}`);

    await Promise.all(filesToRemove.map((file) => file.delete()));
};

const getFilenamesFromFile = async (bucket) => {
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

const getExitingFilenames = async (bucket) => {
    const [exitingFiles] = await bucket.getFiles();

    return exitingFiles.map((exitingFile) => getFilename(exitingFile.name));
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

const uploadFile = async (bucket, filePath, folder) => {
    const [folderName, fileName] = getFolderNameAndFilename(filePath);

    await bucket.upload(filePath, {
        destination: `${folder || folderName}/${fileName}`,
        public: false,
        metadata: {
            cacheControl: 'public, max-age=31536000',
        },
    });
};

const uploadFiles = async (bucket, filePaths, folder) => {
    for (let i = 0; i < filePaths.length; i += BATCH_SIZE) {
        console.log(`- upload batch starting from ${i}`);
        const promises = filePaths
            .slice(i, i + BATCH_SIZE)
            .map((filePath) => uploadFile(bucket, filePath, folder));

        await Promise.all(promises);
    }
};

(async () => {
    const storage = new Storage();
    const bucket = storage.bucket(BUCKET_NAME);

    console.log('Get filenames from file...');
    const filenamesFromJson = await (BUCKET_NAME === GALLERY_BUCKET_NAME
        ? getFilenamesFromFile(bucket)
        : getFilenamesFromHedgehogs(bucket));

    console.log('Remove unrelated files...');
    await removeUnrelatedFiles(bucket, [
        ...FILES_TO_SAVE,
        ...filenamesFromJson,
    ]);

    console.log('Get exiting filenames...');
    const exitingFilenames = await getExitingFilenames(bucket);

    console.log('Get all local file paths...');
    const allLocalFilePaths = await getAllLocalFilePaths(PHOTOS_PATH);

    const localFilePathsToUpload = filenamesFromJson
        .filter(
            (filenameFromJson) => !exitingFilenames.includes(filenameFromJson)
        )
        .map((filenameFromJson) =>
            allLocalFilePaths.find((localFilePaths) =>
                localFilePaths.includes(filenameFromJson)
            )
        );

    console.log('Upload files...', localFilePathsToUpload);
    await uploadFiles(
        bucket,
        localFilePathsToUpload,
        BUCKET_NAME === GALLERY_BUCKET_NAME ? null : HEDGEHOGS_BUCKET_FOLDER
    );

    console.log('Remove not current files...');
    await removeNotCurrentFiles(bucket);
})();
