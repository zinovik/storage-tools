const { Storage } = require('@google-cloud/storage');

const NEW_FILES_GROUPS = [
    {
        filenames: [],
        path: 'path/unsorted',
        accesses: null,
    },
];

//

const BUCKET_NAME = 'zinovik-gallery';
const FILES_FILE_NAME = 'files.json';
const ALBUMS_FILE_NAME = 'albums.json';

const getFile = async (bucket, filename) => {
    const file = await bucket.file(filename).download();

    return JSON.parse(file.toString());
};

const getFiles = async (bucket) => getFile(bucket, FILES_FILE_NAME);
const getAlbums = async (bucket) => getFile(bucket, ALBUMS_FILE_NAME);

const addNewFiles = (files, newFilesGroups) => {
    const newFiles = [];

    newFilesGroups.forEach((newFilesGroup) => {
        newFilesGroup.filenames.forEach((filename) => {
            if (files.find((file) => file.filename === filename)) return;

            newFiles.push({
                path: newFilesGroup.path,
                filename,
                description: '',
                ...(newFilesGroup.accesses
                    ? { accesses: newFilesGroup.accesses }
                    : {}),
            });
        });
    });

    return [...files, ...newFiles];
};

const addNewAlbums = (albums, files) => [
    ...albums,
    ...[
        ...new Set(
            files
                .filter(
                    (file) => !albums.some((album) => album.path === file.path)
                )
                .map((file) => file.path)
        ),
    ].map((path) => {
        const [_, ...parts] = path.split('/');

        return {
            title: parts.join('/'),
            path,
        };
    }),
];

const sortAlbums = (albums) => {
    const sortedAlbums = albums
        .filter((album) => album.isSorted)
        .map((album) => album.path);

    const topLevelAlbums = albums
        .filter((album) => album.path.split('/').length === 1)
        .map((album) => album.path);

    return [...albums].sort((a1, a2) => {
        const a1PathParts = a1.path.split('/');
        const a2PathParts = a2.path.split('/');

        if (a1PathParts.length === 1 && a2PathParts.length === 1) {
            return 0;
        }

        if (a1PathParts[0] !== a2PathParts[0]) {
            return (
                topLevelAlbums.indexOf(a1PathParts[0]) -
                topLevelAlbums.indexOf(a2PathParts[0])
            );
        }

        // the same root path

        // is sorted album
        if (sortedAlbums.includes(a1PathParts[0])) {
            if (a1PathParts.length === a2PathParts.length)
                return a1.path.localeCompare(a2.path);

            const minPathParts = Math.min(
                a1PathParts.length,
                a2PathParts.length
            );

            for (let i = 0; i < minPathParts; i++) {
                if (a1PathParts[i] !== a2PathParts[i]) {
                    if (a1PathParts[i] === undefined) return -1;
                    if (a2PathParts[i] === undefined) return 1;
                    return a1PathParts[i].localeCompare(a2PathParts[i]);
                }
            }
        }

        if (a2.path.includes(a1.path)) return -1;
        if (a1.path.includes(a2.path)) return 1;

        return 0;
    });
};

const sortFiles = (files, albums) => {
    const albumPaths = albums.map((album) => album.path);

    return [...files].sort((f1, f2) =>
        f1.path.split('/')[0] === f2.path.split('/')[0] // the same root path
            ? f1.filename.localeCompare(f2.filename)
            : albumPaths.indexOf(f1.path) - albumPaths.indexOf(f2.path)
    );
};

const saveFile = async (bucket, filename, file) => {
    const bucketFile = bucket.file(filename);
    const dataBuffer = Buffer.from(JSON.stringify(file));

    await bucketFile.save(dataBuffer, {
        gzip: true,
        public: false,
        resumable: true,
        contentType: 'application/json',
        metadata: {
            cacheControl: 'no-cache',
        },
    });
};

const saveFiles = async (bucket, file) =>
    saveFile(bucket, FILES_FILE_NAME, file);
const saveAlbums = async (bucket, file) =>
    saveFile(bucket, ALBUMS_FILE_NAME, file);

(async () => {
    const storage = new Storage();
    const bucket = storage.bucket(BUCKET_NAME);

    console.log('get files...');
    const [files, albums] = await Promise.all([
        getFiles(bucket),
        getAlbums(bucket),
    ]);

    console.log('update files...');
    const updatedFiles = addNewFiles(files, NEW_FILES_GROUPS);
    const updatedAlbums = addNewAlbums(albums, updatedFiles);
    const sortedAlbums = sortAlbums(updatedAlbums);
    const sortedFiles = sortFiles(updatedFiles, albums);

    console.log('save files...');
    await saveFiles(bucket, sortedFiles);
    await saveAlbums(bucket, sortedAlbums);
})();
