const fs = require('fs');
const { Firestore } = require('@google-cloud/firestore');

const PATH_TO_SAVE = '/home/max/projects/private/lists';

const FIRESTORE_DB = 'gallery-db';
const SLASH = '___';

const FILES = [
    { collection: 'files', keyName: 'filename' },
    { collection: 'albums', keyName: 'path' },
    { collection: 'users', keyName: 'email' },
];

(async () => {
    const firestore = new Firestore({
        projectId: 'zinovik-gallery',
        databaseId: FIRESTORE_DB,
    });

    await Promise.all(
        FILES.map(async ({ collection, keyName }) => {
            const snapshot = await firestore.collection(collection).get();

            const docs = snapshot.docs.map((doc) => ({
                [keyName]: doc.id.replace(new RegExp(SLASH, 'g'), '/'),
                ...doc.data(),
            }));

            const sortedDocs = [...docs].sort((d1, d2) =>
                d1[keyName].localeCompare(d2[keyName])
            );

            console.log(sortedDocs.length, collection);

            fs.writeFileSync(
                `${PATH_TO_SAVE}/${collection}.json`,
                JSON.stringify(sortedDocs, null, 4)
            );
        })
    );
})();
