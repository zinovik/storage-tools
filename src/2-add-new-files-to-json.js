const { exec } = require('child_process');
const { promisify } = require('util');
const { GoogleAuth } = require('google-auth-library');
const { Storage } = require('@google-cloud/storage');

const NEW_FILES_GROUPS_MANUAL = [
    {
        filenames: [],
        path: 'path/unsorted',
        accesses: null,
    },
];

const LOCAL_PATH_PART_TO_PATH_MAP = {
    'Board games (pure games)': 'board-games/unsorted',
    // 'Football in Poland': 'football/unsorted',
    Mira: 'mira/unsorted',
    Warsaw: 'warszawa/unsorted',
    'Warsaw (we)': 'warszawa-we/unsorted',
};

//

const UPDATE_SORT_ALBUM_FILES =
    'https://gallery-api-306312319198.europe-central2.run.app/edit/update-sort-albums-files';

// const UPDATE_SORT_ALBUM_FILES =
//     'http://localhost:8080/edit/update-sort-albums-files';

const BUCKET_NAME = 'zinovik-gallery';
const FILES_FILE_NAME = 'files.json';
const PHOTOS_PATH = '/home/max/photos';

const getFilename = (filePath) => filePath.split('/').pop();

const getAllLocalFilePaths = async (filesPath) => {
    const { stdout: treeOutput } = await promisify(exec)(
        `find  ${filesPath} -type f`,
        { maxBuffer: 1024 * 1024 * 4 }
    );

    return treeOutput.split('\n');
};

const getFiles = async (bucket) => {
    const file = await bucket.file(FILES_FILE_NAME).download();

    return JSON.parse(file.toString());
};

const getNewFilesGroupsAuto = (allLocalFilePaths, localPathPartToPathMap) =>
    Object.keys(localPathPartToPathMap).map((localPathPart) => ({
        filenames: allLocalFilePaths
            .filter((localFilePath) =>
                localFilePath.includes(` - ${localPathPart}/`)
            )
            .map(getFilename),
        path: localPathPartToPathMap[localPathPart],
        accesses: null,
    }));

const addNewFiles = (files, newFilesGroups) => {
    const newFiles = [];

    newFilesGroups.forEach((newFilesGroup) => {
        newFilesGroup.filenames.forEach((filename) => {
            if (files.find((file) => file.filename === filename)) return;

            console.log(`NEW FILE: ${newFilesGroup.path}/${filename}`);

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

(async () => {
    const storage = new Storage();
    const bucket = storage.bucket(BUCKET_NAME);

    console.log('get files...');
    const files = await getFiles(bucket);

    console.log('get new local files to add...');
    const allLocalFilePaths = await getAllLocalFilePaths(PHOTOS_PATH);
    const newFilesGroupsAuto = getNewFilesGroupsAuto(
        allLocalFilePaths,
        LOCAL_PATH_PART_TO_PATH_MAP
    );

    console.log('update files...');
    const updatedFiles = addNewFiles(files, [
        ...NEW_FILES_GROUPS_MANUAL,
        ...newFilesGroupsAuto,
    ]);

    console.log('save files...');
    const auth = new GoogleAuth();
    const client = await auth.getIdTokenClient(UPDATE_SORT_ALBUM_FILES);

    const { data } = await client.request({
        url: UPDATE_SORT_ALBUM_FILES,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: updatedFiles }),
    });

    console.log(data);
})();
