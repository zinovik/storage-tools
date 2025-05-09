const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const { GoogleAuth } = require('google-auth-library');
const { Storage } = require('@google-cloud/storage');

const SYNC_DIRECTORIES = JSON.parse(
    fs.readFileSync('./src/SYNC_DIRECTORIES.json').toString()
);

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

const getNewFilesGroups = (allLocalFilePaths, syncDirectories) =>
    syncDirectories.map((syncDirectory) => ({
        filenames: allLocalFilePaths
            .filter((localFilePath) =>
                localFilePath.includes(` - ${syncDirectory.localPathPart}/`)
            )
            .map(getFilename),
        path:
            syncDirectory.path ||
            syncDirectory.localPathPart
                .replaceAll(' ', '-')
                .replaceAll("'", '-')
                .replaceAll(',', '')
                .replaceAll('(', '')
                .replaceAll(')', '')
                .toLowerCase(),
        accesses: syncDirectory.accesses || [],
    }));

const updateFiles = (files, newFilesGroups) => {
    const newFiles = [];

    const filesAfterRemoving = files.filter((file) => {
        const newFilesGroup = newFilesGroups.find((newFilesGroup) =>
            newFilesGroup.filenames.some(
                (filename) => filename === file.filename
            )
        );

        const newPath = newFilesGroup?.path;
        if (!newPath || newPath.split('/')[0] === file.path.split('/')[0])
            return true;

        console.log(`MOVED FILE: ${JSON.stringify(file)}`);
        return false;
    });

    newFilesGroups.forEach((newFilesGroup) => {
        newFilesGroup.filenames.forEach((filename) => {
            if (filesAfterRemoving.find((file) => file.filename === filename))
                return;

            console.log(`NEW FILE: ${newFilesGroup.path}/${filename}`);

            newFiles.push({
                path: newFilesGroup.path,
                filename,
                accesses: newFilesGroup.accesses || [],
            });
        });
    });

    return [...filesAfterRemoving, ...newFiles];
};

const removeFiles = (updatedFiles, allLocalFilePaths) => {
    const allLocalFilenames = allLocalFilePaths.map(getFilename);

    return updatedFiles.filter((file) => {
        if (allLocalFilenames.includes(file.filename)) return true;

        console.log(`REMOVED FILE: ${JSON.stringify(file)}`);

        return false;
    });
};

(async () => {
    const storage = new Storage();
    const bucket = storage.bucket(BUCKET_NAME);

    console.log('get files...');
    const files = await getFiles(bucket);

    console.log('get new local files to add...');
    const allLocalFilePaths = await getAllLocalFilePaths(PHOTOS_PATH);
    const newFilesGroups = getNewFilesGroups(
        allLocalFilePaths,
        SYNC_DIRECTORIES
    );

    newFilesGroups.forEach((newFilesGroup) => {
        if (newFilesGroup.filenames.length === 0)
            console.warn(`WARNING! Empty group '${newFilesGroup.path}'!`);
    });

    console.log('update files...');
    const updatedFiles = updateFiles(files, newFilesGroups);
    const updatedFilesAfterRemoving = removeFiles(
        updatedFiles,
        allLocalFilePaths
    );

    console.log('save files...');
    const auth = new GoogleAuth();
    const client = await auth.getIdTokenClient(UPDATE_SORT_ALBUM_FILES);

    const { data } = await client.request({
        url: UPDATE_SORT_ALBUM_FILES,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: updatedFilesAfterRemoving }),
    });

    console.log(data);
})();
