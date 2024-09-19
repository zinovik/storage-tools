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

const getStorageFilePathsIsPublic = async (bucket, storageFilePaths) => {
    const results = [];

    for (let i = 0; i < storageFilePaths.length; i += ACCESS_BATCH_SIZE) {
        console.log(`- get file access batch starting from ${i}`);
        const promises = storageFilePaths
            .slice(i, i + ACCESS_BATCH_SIZE)
            .map(async (storageFilePath) => ({
                storageFilePath,
                isPublic: await getIsPublic(bucket, storageFilePath),
            }));

        results.push(...(await Promise.all(promises)));
    }

    return results;
};

const getFilesFromJson = async (bucket) => {
    const file = await bucket.file(FILES_FILE_NAME).download();

    return JSON.parse(file.toString());
};

const getAlbumsFromJson = async (bucket) => {
    const file = await bucket.file(ALBUMS_FILE_NAME).download();

    return JSON.parse(file.toString());
};

const getIsPublic = async (bucket, storageFilePath) => {
    const file = bucket.file(storageFilePath);
    const [acl] = await file.acl.get();

    return acl.some(
        (entry) => entry.entity === 'allUsers' && entry.role === 'READER'
    );
};

const getAccessesToUpdate = (
    storageFilePathsIsPublic,
    filesFromJson,
    albumsFromJson
) => {
    const albumAccesses = [
        ...albumsFromJson.filter(
            (album) => album.accesses && album.accesses.length > 0
        ),
    ]
        .sort((a1, a2) => a2.path.split('/').length - a1.path.split('/').length)
        .map((album) => ({
            path: album.path,
            accesses: album.accesses,
        }));

    const publicFilenamesFromJson = filesFromJson
        .filter((file) =>
            (
                file.accesses ||
                albumAccesses.find((albumAccess) =>
                    albumAccess.path.includes(file.path.split('/')[0])
                )?.accesses ||
                []
            ).includes('public')
        )
        .map((file) => file.filename);

    const makePublicPaths = [];
    const makePrivatePaths = [];

    storageFilePathsIsPublic.forEach(({ isPublic, storageFilePath }) => {
        if (
            !isPublic &&
            publicFilenamesFromJson.includes(getFilename(storageFilePath))
        )
            makePublicPaths.push(storageFilePath);

        if (
            isPublic &&
            !publicFilenamesFromJson.includes(getFilename(storageFilePath))
        )
            makePrivatePaths.push(storageFilePath);
    });

    return [makePublicPaths, makePrivatePaths];
};

const updateStorageFileAccesses = async (
    bucket,
    storageFilePaths,
    isPublic
) => {
    for (let i = 0; i < storageFilePaths.length; i += ACCESS_BATCH_SIZE) {
        console.log(
            `- update ${
                isPublic ? 'public' : 'private'
            } file access batch starting from ${i}`
        );
        const promises = storageFilePaths
            .slice(i, i + ACCESS_BATCH_SIZE)
            .map(async (storageFilePath) => {
                if (isPublic) {
                    console.log(`Make PUBLIC: ${storageFilePath}`);
                    await bucket.file(storageFilePath).makePublic();
                } else {
                    console.log(`Make PRIVATE: ${storageFilePath}`);
                    await bucket
                        .file(storageFilePath)
                        .makePrivate({ strict: true });
                }
            });

        await Promise.all(promises);
    }
};

(async () => {
    const storage = new Storage();
    const bucket = storage.bucket(BUCKET_NAME);

    console.log('Get exiting storage files...');
    const exitingStorageFilePaths = await getExitingStorageFilePaths(bucket);

    console.log('Get storage files accesses...');
    const storageFilePathsIsPublic = await getStorageFilePathsIsPublic(
        bucket,
        exitingStorageFilePaths
    );

    console.log('Get files...');
    const filesFromJson = await getFilesFromJson(bucket);

    console.log('Get albums...');
    const albumsFromJson = await getAlbumsFromJson(bucket);

    const [makePublicPaths, makePrivatePaths] = getAccessesToUpdate(
        storageFilePathsIsPublic,
        filesFromJson,
        albumsFromJson
    );

    console.log(makePublicPaths, makePrivatePaths);

    console.log('Update public accesses...');
    await updateStorageFileAccesses(bucket, makePublicPaths, true);

    console.log('Update private accesses...');
    await updateStorageFileAccesses(bucket, makePrivatePaths, false);
})();
