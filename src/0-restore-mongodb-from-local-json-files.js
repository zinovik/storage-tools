const fs = require('fs');
const mongoose = require('mongoose');
const { FILES_MODELS } = require('./files-models');

const line = fs
    .readFileSync('.env', 'utf8')
    .split('\n')
    .find((l) => l.startsWith('MONGO_URI='));
const [, ...rest] = line.split('=');
const MONGO_URI = rest.join('=').trim();

const PATH_TO_READ = '/home/max/projects/private/lists';

(async () => {
    await mongoose.connect(MONGO_URI);
    console.log('connected');

    await Promise.all(
        FILES_MODELS.map(async ({ filename, model }) => {
            const docs = JSON.parse(
                fs.readFileSync(`${PATH_TO_READ}/${filename}.json`, 'utf8')
            );

            console.log(docs.length, filename);

            await model.deleteMany({});

            await model.insertMany(docs);
        })
    );

    await mongoose.disconnect();
})();
