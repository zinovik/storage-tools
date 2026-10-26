const { Storage } = require('@google-cloud/storage');
const { performBatch } = require('./perform-batch');
const { BUCKET_NAME_FILES } = require('./constants');
const { getLocalFilesNamesSet } = require('./get-local-files-paths');
const {
    getStorageExistingFiles,
} = require('./get-storage-existing-files-paths');

const CLEAN_UP_BATCH_SIZE = 100;

const getFilename = (filePath) => filePath.split('/').pop();

const getCurrentVersionsMap = (files) => {
    const currentVersionMap = {};

    files.forEach((file) => {
        if (
            !currentVersionMap[file.name] ||
            currentVersionMap[file.name] < file.generation
        )
            currentVersionMap[file.name] = file.generation;
    });

    return currentVersionMap;
};

(async () => {
    const storageFiles = new Storage();
    const bucket = storageFiles.bucket(BUCKET_NAME_FILES);

    const localFilenamesSet = await getLocalFilesNamesSet();

    const storageExistingFiles = await getStorageExistingFiles(bucket, true);

    const unrelatedFiles = storageExistingFiles.filter(
        (storageFile) => !localFilenamesSet.has(getFilename(storageFile.name))
    );
    const softDeletedFiles = storageExistingFiles.filter(
        (storageFile) => storageFile.metadata.timeDeleted
    );
    const currentVersionsMap = getCurrentVersionsMap(storageExistingFiles);
    const oldFileVersions = storageExistingFiles.filter(
        (file) => file.generation !== currentVersionsMap[file.name]
    );

    const filesToRemove = [
        ...unrelatedFiles,
        ...softDeletedFiles,
        ...oldFileVersions,
    ];

    if (filesToRemove.length === 0) {
        console.log('No files to remove.');
        return;
    }

    console.log(unrelatedFiles.map((f) => f.id));
    console.log(`Unrelated files to remove: ${unrelatedFiles.length}`);

    console.log(softDeletedFiles.map((f) => f.id));
    console.log(`Soft deleted files to remove: ${softDeletedFiles.length}`);

    console.log(oldFileVersions.map((f) => f.id));
    console.log(`Old file versions to remove: ${oldFileVersions.length}`);

    await performBatch(
        filesToRemove,
        async (file) => await file.delete(),
        CLEAN_UP_BATCH_SIZE,
        'delete files'
    );
})();
