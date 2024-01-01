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

const streamToString = (stream) => {
    const chunks = [];

    return new Promise((resolve, reject) => {
        stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        stream.on('error', (error) => reject(error));
        stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    });
};

FILES.forEach(async (path) => {
    console.log(`Getting ${path}...`);
    const [bucketName, fileName] = path.split('/');

    const bucket = storage.bucket(bucketName);
    const file = bucket.file(fileName);

    const data = await streamToString(file.createReadStream());

    PATHS_TO_SAVE.forEach((pathToSave) =>
        fs.writeFileSync(
            `${pathToSave}${fileName}`,
            JSON.stringify(JSON.parse(data), null, 4)
        )
    );

    console.log(`${path} was saved`);
});
