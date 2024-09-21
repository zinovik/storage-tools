const { GoogleAuth } = require('google-auth-library');
const { Storage } = require('@google-cloud/storage');

const NEW_FILES_GROUPS = [
    {
        filenames: [],
        path: 'path/unsorted',
        accesses: null,
    },
];

//

const UPDATE_SORT_ALBUM_FILES =
    'https://gallery-api-306312319198.europe-central2.run.app/edit/update-sort-albums-files';

// const UPDATE_SORT_ALBUM_FILES =
//     'http://localhost:8080/edit/update-sort-albums-files';

const BUCKET_NAME = 'zinovik-gallery';
const FILES_FILE_NAME = 'files.json';

const getFile = async (bucket, filename) => {
    const file = await bucket.file(filename).download();

    return JSON.parse(file.toString());
};

const getFiles = async (bucket) => getFile(bucket, FILES_FILE_NAME);

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

(async () => {
    const storage = new Storage();
    const bucket = storage.bucket(BUCKET_NAME);

    console.log('get files...');
    const files = await getFiles(bucket);

    console.log('update files...');
    const updatedFiles = addNewFiles(files, NEW_FILES_GROUPS);

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
