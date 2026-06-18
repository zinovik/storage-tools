const { exec } = require('child_process');
const { promisify } = require('util');
const { Storage } = require('@google-cloud/storage');
const { performBatch } = require('./perform-batch');
const { BUCKET_NAME_FILES: BUCKET_NAME_FILES_GALLERY } = require('./constants');

const PHOTOS_PATH = '/home/max/photos';

const CLEAN_UP_BATCH_SIZE = 100;

const FORCE_REMOVE_PATHS = [];

const getFilename = (filePath) => filePath.split('/').pop();

const getAllLocalFilenames = async (filesPath) => {
    const { stdout: treeOutput } = await promisify(exec)(
        `find  ${filesPath} -type f`,
        { maxBuffer: 1024 * 1024 * 4 }
    );

    return treeOutput.split('\n').map(getFilename);
};

// remove files that are not presented locally
const removeUnrelatedFiles = async (bucket, filesToSave) => {
    const [exitingFiles] = await bucket.getFiles({ versions: true });

    const filesToRemove = exitingFiles
        .filter((file) => !filesToSave.includes(getFilename(file.name)))
        .map((file) =>
            bucket.file(file.name, {
                generation: file.generation,
            })
        );

    console.log(filesToRemove.map((f) => f.id));
    console.log(`Unrelated files to remove: ${filesToRemove.length}`);

    await performBatch(
        filesToRemove,
        async (file) => await file.delete(),
        CLEAN_UP_BATCH_SIZE,
        'delete files'
    );
};

const filterOldVersions = (files) => {
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

const removeOldFileVersions = async (bucket) => {
    const [exitingFiles] = await bucket.getFiles({ versions: true });

    const filesToRemove = filterOldVersions(exitingFiles).map((file) =>
        bucket.file(file.name, {
            generation: file.generation,
        })
    );

    console.log(filesToRemove.map((f) => f.id));
    console.log(`Old file versions to remove: ${filesToRemove.length}`);

    await Promise.all(filesToRemove.map((file) => file.delete()));
};

const removeSoftDeletedFiles = async (bucket) => {
    const [exitingFiles] = await bucket.getFiles({ versions: true });

    const filesToRemove = exitingFiles
        .filter((file) => file.metadata.timeDeleted)
        .map((file) =>
            bucket.file(file.name, {
                generation: file.generation,
            })
        );

    console.log(filesToRemove.map((f) => f.id));
    console.log(`Soft deleted files to remove: ${filesToRemove.length}`);

    await performBatch(
        filesToRemove,
        async (file) => await file.delete(),
        CLEAN_UP_BATCH_SIZE,
        'delete files'
    );
};

(async () => {
    const storageFiles = new Storage();
    const bucketFiles = storageFiles.bucket(BUCKET_NAME_FILES_GALLERY);

    console.log('Get all local file names...');
    const allLocalFilenames = await getAllLocalFilenames(PHOTOS_PATH);

    console.log('Remove unrelated files...');
    await removeUnrelatedFiles(bucketFiles, allLocalFilenames);

    console.log('Remove old file versions...');
    await removeOldFileVersions(bucketFiles);

    console.log('Remove soft deleted files...');
    await removeSoftDeletedFiles(bucketFiles);
})();
