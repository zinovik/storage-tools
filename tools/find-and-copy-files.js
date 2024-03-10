const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const files = require('../../../../drive/json_backup/files.json');

const ALBUMS = [
    'zanzibar',
    'naliboki',
    'sakartvelo',
    'zalessie',
    'sri-lanka',
    'uzbekistan',
    'berlin',
    'netherlands',
    'greece',
    'football',
    'gigs',
    'board-games',
];
const SOURCE_PATH = '/home/max/photos';
const DESTINATION_PATH = `/home/max/projects/private/backup-storage-files/tools`;

(async () => {
    const { stdout: treeOutput } = await promisify(exec)(
        `tree /home/max/photos -f`,
        { maxBuffer: 1024 * 1024 * 4 }
    );

    const filePaths = treeOutput
        .split('\n')
        .map((filePath) => filePath.substring(filePath.indexOf(SOURCE_PATH)));

    const errors = [];

    for (let i = 0; i < ALBUMS.length; i++) {
        const album = ALBUMS[i];

        try {
            await promisify(exec)(`mkdir tools/${album}`);
        } catch (error) {
            console.warn(error.message);
        }

        const alreadyCopiedFiles = fs.readdirSync(`tools/${album}`);

        const filenames = files
            .filter((file) => file.path.startsWith(album))
            .map((file) => file.filename);

        filenames.forEach((filename, index) => {
            console.log(
                `[${album}] File: ${index + 1}/${
                    filenames.length
                } (${filename})`
            );

            if (alreadyCopiedFiles.includes(filename)) {
                console.log('SKIPPED! Already copied');
                return;
            }

            const currentFilePath = filePaths.find((filePath) =>
                filePath.endsWith(filename)
            );

            try {
                fs.copyFileSync(
                    currentFilePath,
                    `${DESTINATION_PATH}/${album}/${filename}`
                );
            } catch (error) {
                errors.push({
                    filename,
                    path: currentFilePath,
                    message: error.message,
                });
            }
        });
    }

    errors.forEach(({ filename, path, message }) =>
        console.error(filename, path, message)
    );
})();
