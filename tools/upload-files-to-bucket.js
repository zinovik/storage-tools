const fs = require('fs');
const { Storage, TransferManager } = require('@google-cloud/storage');

// const BUCKET_NAME = 'hedgehogs';
// const DIRECTORIES = ['photos'];

const BUCKET_NAME = 'zinovik-gallery';
const DIRECTORIES = [
    '2024.07.04 - Mira Vychulki photo session (portraits_by_sh)',
    'vietnam',
    'hoverla',
    'eurotrip',
    'zanzibar',
    'naliboki',
    'sakartvelo',
    'zalessie',
    'wild-belarus',
    'sri-lanka',
    'uzbekistan',
    'svaneti',
    'ski-resorts',
    'berlin',
    'netherlands',
    'greece',
    'munich',
    'warszawa',
    'football',
    'gigs',
    'board-games',
];

const FILES_TO_SAVE = [
    'hedgehogs.json',
    'albums.json',
    'files.json',
    'sources-config.json',
];
const FOLDERS_TO_SAVE = [
    'photos',
    '2024.07.04 - Mira Vychulki photo session (portraits_by_sh)',
    'vietnam',
    'hoverla',
    'eurotrip',
    'zanzibar',
    'naliboki',
    'sakartvelo',
    'zalessie',
    'wild-belarus',
    'sri-lanka',
    'uzbekistan',
    'svaneti',
    'ski-resorts',
    'berlin',
    'netherlands',
    'greece',
    'munich',
    'warszawa',
    'football',
    'gigs',
    'board-games',
];

const storage = new Storage();
const bucket = storage.bucket(BUCKET_NAME);

const transferManager = new TransferManager(bucket);

const removeUnrelatedFiles = async (bucket, filesToSave, foldersToSave) => {
    const [exitingFiles] = await bucket.getFiles({ versions: true });

    const filesToRemove = exitingFiles
        .filter(
            (file) =>
                !filesToSave.includes(file.name) &&
                !foldersToSave.some((folder) =>
                    file.name.startsWith(`${folder}/`)
                )
        )
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

(async () => {
    await removeUnrelatedFiles(bucket, FILES_TO_SAVE, FOLDERS_TO_SAVE);

    const [exitingFiles] = await bucket.getFiles();
    const exitingFilenames = exitingFiles.map(
        (exitingFile) => exitingFile.name
    );

    for (let i = 0; i < DIRECTORIES.length; i++) {
        const directory = DIRECTORIES[i];

        console.log(`Upload directory ${directory}...`);

        const localFilenames = fs.readdirSync(directory);

        const filesToUpload = localFilenames
            .map((file) => `${directory}/${file}`)
            .filter((file) => !exitingFilenames.includes(file));

        if (filesToUpload.length === 0) continue;

        await transferManager.uploadManyFiles(filesToUpload, {
            passthroughOptions: {
                public: false,
                metadata: {
                    cacheControl: 'public, max-age=31536000',
                },
            },
        });
    }

    await removeNotCurrentFiles(bucket);
})();
