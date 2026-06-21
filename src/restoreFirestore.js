const fs = require('fs');
const { Firestore } = require('@google-cloud/firestore');

const PATH_TO_READ = '/home/max/projects/private/lists';

const FIRESTORE_DB = 'gallery-db';
const SLASH = '___';

const FILES = [
    { collection: 'files', keyName: 'filename' },
    { collection: 'albums', keyName: 'path' },
    { collection: 'users', keyName: 'email' },
];

const deleteCollection = async (firestore, collectionName) => {
    const collectionRef = firestore.collection(collectionName);

    while (true) {
        const snapshot = await collectionRef.limit(500).get();

        if (snapshot.empty) {
            break;
        }

        const batch = firestore.batch();

        snapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });

        await batch.commit();
    }
};

const writeFirestoreDocuments = async (
    firestore,
    collectionName,
    documents,
    keyName
) => {
    const chunks = [];

    for (let i = 0; i < documents.length; i += 500) {
        chunks.push(documents.slice(i, i + 500));
    }

    for (const chunk of chunks) {
        const batch = firestore.batch();

        for (const item of chunk) {
            const { [keyName]: id, ...data } = item;

            batch.set(
                firestore
                    .collection(collectionName)
                    .doc(id.replace(/\//g, SLASH)),
                {
                    ...data,
                }
            );
        }

        await batch.commit();
    }
};

(async () => {
    const firestore = new Firestore({
        projectId: 'zinovik-gallery',
        databaseId: FIRESTORE_DB,
    });

    await Promise.all(
        FILES.map(async ({ collection, keyName }) => {
            const docs = JSON.parse(
                fs.readFileSync(`${PATH_TO_READ}/${collection}.json`, 'utf8')
            );

            console.log(docs.length, collection);

            await deleteCollection(firestore, collection);

            await writeFirestoreDocuments(firestore, collection, docs, keyName);
        })
    );
})();
