const fs = require('fs');
const { Storage } = require('@google-cloud/storage');

const FILES = [
    'digital-board-games/digital-board-games.json',
    'hedgehogs/hedgehogs.json',
];

const PATH_TO_SAVE = '/home/max/projects/private/lists/';

const storage = new Storage();

(async () => {
    for (const path of FILES) {
        const [bucketName, fileName] = path.split('/');

        const bucket = storage.bucket(bucketName);
        const file = await bucket.file(fileName).download();

        fs.writeFileSync(
            `${PATH_TO_SAVE}${fileName}`,
            JSON.stringify(JSON.parse(file.toString('utf8')), null, 4)
        );

        console.log(`${path} was saved`);
    }
})();
