const { Storage } = require('@google-cloud/storage');
const { performBatch } = require('./perform-batch');
const { BUCKET_NAME_FILES: BUCKET_NAME_FILES_GALLERY } = require('./constants');

const GALLERY_BUCKET_NAME_JSONS = 'zinovik-gallery';
const GALLERY_BUCKET_NAME_FILES = BUCKET_NAME_FILES_GALLERY;
const HEDGEHOGS_BUCKET_NAME_JSONS = 'hedgehogs';
const HEDGEHOGS_BUCKET_NAME_FILES = 'hedgehogs';

// CHOOSE THE BUCKETS
const IS_GALLERY = true;

const BUCKET_NAME_JSONS = IS_GALLERY
    ? GALLERY_BUCKET_NAME_JSONS
    : HEDGEHOGS_BUCKET_NAME_JSONS;
const BUCKET_NAME_FILES = IS_GALLERY
    ? GALLERY_BUCKET_NAME_FILES
    : HEDGEHOGS_BUCKET_NAME_FILES;

const CLEAN_UP_BATCH_SIZE = 100;
const FILES_FILE_NAME = 'files.json';
const HEDGEHOGS_FILE_NAME = 'hedgehogs.json';

const FILES_TO_SAVE = IS_GALLERY
    ? ['albums.json', FILES_FILE_NAME, 'users.json']
    : [HEDGEHOGS_FILE_NAME];

const FORCE_REMOVE_PATHS = [];

const getFilename = (filePath) => filePath.split('/').pop();

const getFilenamesFromFile = async (bucket) => {
    const file = await bucket.file(FILES_FILE_NAME).download();

    return JSON.parse(file.toString())
        .filter((file) =>
            FORCE_REMOVE_PATHS.every(
                (path) =>
                    file.path !== path && !file.path.startsWith(`${path}/`)
            )
        )
        .map((file) => file.filename);
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

// remove files that are not in files.json or not presented locally?
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
    const storageJsons = new Storage();
    const storageFiles = new Storage();
    const bucketJsons = storageJsons.bucket(BUCKET_NAME_JSONS);
    const bucketFiles = storageFiles.bucket(BUCKET_NAME_FILES);

    console.log('Get filenames from file...');
    const filenamesFromJson = await (IS_GALLERY
        ? getFilenamesFromFile(bucketJsons)
        : getFilenamesFromHedgehogs(bucketJsons));

    console.log('Remove unrelated files...');
    await removeUnrelatedFiles(bucketFiles, [
        ...FILES_TO_SAVE,
        ...filenamesFromJson,
    ]);

    console.log('Remove old file versions...');
    await removeOldFileVersions(bucketFiles);

    console.log('Remove soft deleted files...');
    await removeSoftDeletedFiles(bucketFiles);
})();
