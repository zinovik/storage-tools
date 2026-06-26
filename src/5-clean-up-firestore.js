const fs = require('fs');
const { execSync } = require('child_process');

const FILES_FILE_NAME = '/home/max/projects/private/lists/files.json';
const ALBUMS_FILE_NAME = '/home/max/projects/private/lists/albums.json';

const PHOTOS_PATH = '/home/max/photos';

const files = JSON.parse(fs.readFileSync(FILES_FILE_NAME, 'utf8'));
const albums = JSON.parse(fs.readFileSync(ALBUMS_FILE_NAME, 'utf8'));

const getAllLocalFilePaths = (filesPath) => {
    const treeOutput = execSync(`find ${filesPath} -type f`, {
        maxBuffer: 1024 * 1024 * 4,
    }).toString();

    return treeOutput.split('\n').filter(Boolean);
};

const allLocalFilePaths = getAllLocalFilePaths(PHOTOS_PATH);

const filenamePathMap = {};
allLocalFilePaths.forEach((localFilePath) => {
    const filename = localFilePath.split('/').pop();

    const path = localFilePath
        .replace(PHOTOS_PATH, '')
        .split('/')
        .slice(0, -1)
        .join('/')
        .replace(/(?:^|\/)\d{4}\.\d{2}\.\d{2} - /, '')
        .trim()
        .replace(/[(),]/g, '')
        .replace(/[\s']+/g, '-')
        .replace(/-+/g, '-')
        .toLowerCase();

    filenamePathMap[filename] = path;
});

const albumsWithDefaultAccesses = {};

albums.forEach((album) => {
    if (album.defaultAccesses) {
        albumsWithDefaultAccesses[album.path] = album;
    }
});

const filteredFiles = files.filter((file) => {
    let albumWithDefaultAccesses;
    let path = file.path;

    while (path) {
        albumWithDefaultAccesses = albumsWithDefaultAccesses[path];

        if (albumWithDefaultAccesses) break;

        path = path.substring(0, path.lastIndexOf('/'));
    }

    if (!albumWithDefaultAccesses) return true;

    const shouldRemove =
        (!file.accesses ||
            file.accesses.join(',') ===
                albumWithDefaultAccesses.defaultAccesses.join(',')) &&
        !file.description &&
        !file.text &&
        (!file.path ||
            !filenamePathMap[file.filename] ||
            file.path === filenamePathMap[file.filename]);

    if (shouldRemove) console.log('REMOVED FILE:', JSON.stringify(file));

    return !shouldRemove;
});

const mappedFiles = filteredFiles.map((file) => {
    let albumWithDefaultAccesses;
    let path = file.path;

    while (path) {
        albumWithDefaultAccesses = albumsWithDefaultAccesses[path];

        if (albumWithDefaultAccesses) break;

        path = path.substring(0, path.lastIndexOf('/'));
    }

    if (
        albumWithDefaultAccesses &&
        file.accesses &&
        file.accesses.join(',') ===
            albumWithDefaultAccesses.defaultAccesses.join(',')
    ) {
        delete file.accesses;
    }

    if (file.path === filenamePathMap[file.filename]) {
        delete file.path;
    }

    return file;
});

const mappedAlbums = albums.map((album) => {
    let albumWithDefaultAccesses;
    let path = album.path;

    while (path) {
        albumWithDefaultAccesses = albumsWithDefaultAccesses[path];

        if (albumWithDefaultAccesses) break;

        path = path.substring(0, path.lastIndexOf('/'));
    }

    if (
        albumWithDefaultAccesses &&
        album.accesses &&
        album.accesses.join(',') ===
            albumWithDefaultAccesses.defaultAccesses.join(',')
    ) {
        delete album.accesses;
    }

    return album;
});

fs.writeFileSync(FILES_FILE_NAME, JSON.stringify(mappedFiles, null, 4), 'utf8');
fs.writeFileSync(
    ALBUMS_FILE_NAME,
    JSON.stringify(mappedAlbums, null, 4),
    'utf8'
);

console.log(`Removed ${files.length - mappedFiles.length} items`);
console.log(`Remaining ${mappedFiles.length} items`);
