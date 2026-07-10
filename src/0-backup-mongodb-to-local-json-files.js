const fs = require('fs');
const mongoose = require('mongoose');
const { FILES_MODELS } = require('./files-models');

const line = fs
    .readFileSync('.env', 'utf8')
    .split('\n')
    .find((l) => l.startsWith('MONGO_URI='));
const [, ...rest] = line.split('=');
const MONGO_URI = rest.join('=').trim();

const PATH_TO_SAVE = '/home/max/projects/private/lists';

(async () => {
    await mongoose.connect(MONGO_URI);
    console.log('connected');

    await Promise.all(
        FILES_MODELS.map(async ({ filename, model, sortBy }) => {
            const docs = await model.find(
                {},
                { _id: 0, __v: 0 },
                { lean: true }
            );

            const cleanDocs = [];

            docs.forEach((doc) => {
                delete doc.resolved;

                if (Object.keys(doc).length <= 1) {
                    return;
                }

                cleanDocs.push(doc);
            });

            const sortedDocs = [...cleanDocs].sort((d1, d2) =>
                d1[sortBy].localeCompare(d2[sortBy])
            );

            console.log(sortedDocs.length, filename);

            fs.writeFileSync(
                `${PATH_TO_SAVE}/${filename}.json`,
                JSON.stringify(sortedDocs, null, 4)
            );
        })
    );

    await mongoose.disconnect();
})();
