const fs = require('fs');
const mongoose = require('mongoose');

const line = fs
    .readFileSync('.env', 'utf8')
    .split('\n')
    .find((l) => l.startsWith('MONGO_URI='));
const [, ...rest] = line.split('=');
const MONGO_URI = rest.join('=').trim();

const PATH_TO_SAVE = '/home/max/projects/private/lists';

const FILES = [
    {
        filename: 'files',
        model: mongoose.model(
            'File',
            new mongoose.Schema({}, { strict: false })
        ),
        sortBy: 'filename',
    },
    {
        filename: 'albums',
        model: mongoose.model(
            'Album',
            new mongoose.Schema({}, { strict: false })
        ),
        sortBy: 'path',
    },
    {
        filename: 'users',
        model: mongoose.model(
            'User',
            new mongoose.Schema({}, { strict: false })
        ),
        sortBy: 'email',
    },
];

(async () => {
    await mongoose.connect(MONGO_URI);
    console.log('connected');

    await Promise.all(
        FILES.map(async ({ filename, model, sortBy }) => {
            const docs = await model.find(
                {},
                { _id: 0, __v: 0 },
                { lean: true }
            );

            const sortedDocs = [...docs].sort((d1, d2) =>
                d1[sortBy].localeCompare(d2[sortBy])
            );

            console.log(sortedDocs.length, filename);

            // sort during request

            fs.writeFileSync(
                `${PATH_TO_SAVE}/${filename}.json`,
                JSON.stringify(sortedDocs, null, 4)
            );
        })
    );

    await mongoose.disconnect();
})();
