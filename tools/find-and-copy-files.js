const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const files = require('../../../../drive/json_backup/files.json');

const PATH = 'gigs';

const SOURCE_PATH = '/home/max/photos';
const DESTINATION_PATH = `/home/max/projects/private/backup-storage-files/tools/${PATH}`;

(async () => {
    await promisify(exec)(`mkdir tools/${PATH}`, { maxBuffer: 1024 * 1024 * 4 });

    const { stdout: treeOutput } = await promisify(exec)(
        `tree /home/max/photos -f`,
        { maxBuffer: 1024 * 1024 * 4 }
    );

    const filePaths = treeOutput
        .split('\n')
        .map((filePath) => filePath.substring(filePath.indexOf(SOURCE_PATH)));

    const filenames = files
        .filter((file) => file.path.startsWith(PATH))
        .map((file) => file.filename);

    filenames.forEach((filename, index) => {
        console.log(`File: ${index + 1}/${filenames.length} (${filename})`);

        const path = filePaths.find((filePath) => filePath.endsWith(filename));

        fs.copyFileSync(path, `${DESTINATION_PATH}/${filename}`);
    });
})();
