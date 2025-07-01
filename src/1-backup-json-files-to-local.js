const fs = require('fs');
const { Storage } = require('@google-cloud/storage');

const FILES = [
    'digital-board-games/digital-board-games.json',
    'hedgehogs/hedgehogs.json',
    'zinovik-gallery/albums.json',
    'zinovik-gallery/files.json',
    'zinovik-gallery/sources-config.json',
    'zinovik-gallery/users.json',
];

const PATHS_TO_SAVE = ['/home/max/drive/json_backup/', '/home/max/projects/private/lists/'];

const SYNC_DIRECTORIES_FILE = 'SYNC_DIRECTORIES.json';

const storage = new Storage();

FILES.forEach(async (path) => {
    const [bucketName, fileName] = path.split('/');

    const bucket = storage.bucket(bucketName);
    const file = await bucket.file(fileName).download();

    PATHS_TO_SAVE.forEach((pathToSave) =>
        fs.writeFileSync(
            `${pathToSave}${fileName}`,
            JSON.stringify(JSON.parse(file.toString()), null, 4)
        )
    );

    console.log(`${path} was saved`);
});

PATHS_TO_SAVE.forEach((pathToSave) =>
    fs.copyFileSync(
        `./src/${SYNC_DIRECTORIES_FILE}`,
        `${pathToSave}${SYNC_DIRECTORIES_FILE}`
    )
);
