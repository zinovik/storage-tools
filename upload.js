const fs = require('fs');
const { Storage, TransferManager } = require('@google-cloud/storage');

const DIRECTORY = 'photos';
const BUCKET_NAME = 'hedgehogs';

const localFilenames = fs.readdirSync(DIRECTORY);

const storage = new Storage();
const bucket = storage.bucket(BUCKET_NAME);

const transferManager = new TransferManager(bucket);

(async () => {
    const [exitingFiles] = await bucket.getFiles();
    const exitingFilenames = exitingFiles.map(
        (exitingFile) => exitingFile.name
    );
    const filesToUpload = localFilenames
        .map((file) => `${DIRECTORY}/${file}`)
        .filter((file) => !exitingFilenames.includes(file));

    if (filesToUpload.length === 0) return;

    await transferManager.uploadManyFiles(filesToUpload, {
        passthroughOptions: {
            public: true,
        },
    });
})();
