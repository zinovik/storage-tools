const fs = require('fs');
const mongoose = require('mongoose');

const line = fs
    .readFileSync('.env', 'utf8')
    .split('\n')
    .find((l) => l.startsWith('MONGO_URI='));
const [, ...rest] = line.split('=');
const MONGO_URI = rest.join('=').trim();

const PATH_TO_READ = '/home/max/projects/private/lists';

const FILES = [
    {
        filename: 'files',
        model: mongoose.model(
            'File',
            new mongoose.Schema({}, { strict: false })
        ),
    },
    {
        filename: 'albums',
        model: mongoose.model(
            'Album',
            new mongoose.Schema({}, { strict: false })
        ),
    },
    {
        filename: 'users',
        model: mongoose.model(
            'User',
            new mongoose.Schema({}, { strict: false })
        ),
    },
];

(async () => {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('connected');

    await Promise.all(
        FILES.map(async ({ filename, model }) => {
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
