const { Storage } = require('@google-cloud/storage');

const GALLERY_BUCKET_NAME = 'zinovik-gallery';
const HEDGEHOGS_BUCKET_NAME = 'hedgehogs';

// CHOOSE THE BUCKET
const BUCKET_NAME = GALLERY_BUCKET_NAME;
// const BUCKET_NAME = HEDGEHOGS_BUCKET_NAME;

const FILES_FILE_NAME = 'files.json';
const HEDGEHOGS_FILE_NAME = 'hedgehogs.json';

const FILES_TO_SAVE = [
    ...(BUCKET_NAME === GALLERY_BUCKET_NAME
        ? ['albums.json', FILES_FILE_NAME, 'sources-config.json', 'users.json']
        : []),
    ...(BUCKET_NAME === HEDGEHOGS_BUCKET_NAME ? [HEDGEHOGS_FILE_NAME] : []),
];

const getFilename = (filePath) => filePath.split('/').pop();

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

    console.log(`Unrelated files to remove: ${filesToRemove.length}`);

    await Promise.all(filesToRemove.map((file) => file.delete()));
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

    console.log(`Old file versions to remove: ${filesToRemove.length}`);

    await Promise.all(filesToRemove.map((file) => file.delete()));
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

    console.log('Remove old file versions...');
    await removeOldFileVersions(bucket);
})();
