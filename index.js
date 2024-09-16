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

const PATH_TO_SAVE = '/home/max/drive/json_backup/';

const storage = new Storage();

FILES.forEach(async (path) => {
    console.log(`Getting ${path}...`);
    const [bucketName, fileName] = path.split('/');

    const bucket = storage.bucket(bucketName);
    const file = await bucket.file(fileName).download();

    fs.writeFileSync(
        `${PATH_TO_SAVE}${fileName}`,
        JSON.stringify(JSON.parse(file.toString()), null, 4)
    );

    console.log(`${path} was saved`);
});
