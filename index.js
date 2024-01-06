const { Storage } = require('@google-cloud/storage');
const fs = require('fs');

const FILES = [
    'digital-board-games/digital-board-games.json',
    'hedgehogs/hedgehogs.json',
    'zinovik-gallery/albums.json',
    'zinovik-gallery/files.json',
    'zinovik-gallery/sources-config.json',
];

const PATHS_TO_SAVE = [
    '/home/max/drive/json_backup/',
    '/home/max/gdrive/json_backup/',
];

const storage = new Storage();

FILES.forEach(async (path) => {
    console.log(`Getting ${path}...`);
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
