const { Storage } = require('@google-cloud/storage');

const BUCKET_NAME = 'zinovik-gallery';

const ACCESS_BATCH_SIZE = 200;
const FILES_FILE_NAME = 'files.json';
const ALBUMS_FILE_NAME = 'albums.json';

const getFilename = (filePath) => filePath.split('/').pop();

const getExitingStorageFilePaths = async (bucket) => {
    const [exitingFiles] = await bucket.getFiles();

    return exitingFiles.map((exitingFile) => exitingFile.name);
};

const getFileAccesses = async (bucket) => {
    const file = await bucket.file(FILES_FILE_NAME).download();

    return JSON.parse(file.toString()).map((file) => ({
        filename: file.filename,
        path: file.path,
        accesses: file.accesses,
    }));
};

const getAllAlbumAccesses = async (bucket) => {
    const file = await bucket.file(ALBUMS_FILE_NAME).download();

    const albums = JSON.parse(file.toString());

    return [
        ...albums.filter(
            (album) => album.accesses && album.accesses.length > 0
        ),
    ]
        .sort((a1, a2) => a2.path.split('/').length - a1.path.split('/').length)
        .map((album) => ({
            path: album.path,
            accesses: album.accesses,
        }));
};

const getIsPublicCurrent = async (bucket, storageFilePath) => {
    const file = bucket.file(storageFilePath);
    const [acl] = await file.acl.get();

    return acl.some(
        (entry) => entry.entity === 'allUsers' && entry.role === 'READER'
    );
};

// TODO: Read all and then update all
const updateFileAccesses = async (
    bucket,
    storageFilePaths,
    publicFilenames
) => {
    for (let i = 0; i < storageFilePaths.length; i += ACCESS_BATCH_SIZE) {
        console.log(`- update file access batch starting from ${i}`);
        const promises = storageFilePaths
            .slice(i, i + ACCESS_BATCH_SIZE)
            .map(async (storageFilePath) => {
                const isPublicCurrent = await getIsPublicCurrent(
                    bucket,
                    storageFilePath
                );

                if (
                    isPublicCurrent &&
                    !publicFilenames.includes(getFilename(storageFilePath))
                ) {
                    console.log(`Make PRIVATE: ${storageFilePath}`);
                    await bucket
                        .file(storageFilePath)
                        .makePrivate({ strict: true });
                }

                if (
                    !isPublicCurrent &&
                    publicFilenames.includes(getFilename(storageFilePath))
                ) {
                    console.log(`Make PUBLIC: ${storageFilePath}`);
                    await bucket.file(storageFilePath).makePublic();
                }
            });

        await Promise.all(promises);
    }
};

const getPublicFilenames = (accessesFromJson, allAlbumAccesses) =>
    accessesFromJson
        .filter((file) =>
            (
                file.accesses ||
                allAlbumAccesses.find((albumAccess) =>
                    albumAccess.path.includes(file.path.split('/')[0])
                )?.accesses ||
                []
            ).includes('public')
        )
        .map((file) => file.filename);

(async () => {
    const storage = new Storage();
    const bucket = storage.bucket(BUCKET_NAME);

    console.log('Get exiting file paths...');
    const exitingStorageFilePaths = await getExitingStorageFilePaths(bucket);

    console.log('Get file accesses...');
    const accessesFromJson = await getFileAccesses(bucket);

    console.log('Get album accesses...');
    const allAlbumAccesses = await getAllAlbumAccesses(bucket);

    const publicFilenames = getPublicFilenames(
        accessesFromJson,
        allAlbumAccesses
    );

    await updateFileAccesses(bucket, exitingStorageFilePaths, publicFilenames);
})();
