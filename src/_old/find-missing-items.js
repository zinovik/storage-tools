const files = require('../files.json');
const sourcesConfig = require('../sources-config.json');
const albums = require('../albums.json');

files.forEach((file) => {
  if (!Object.keys(sourcesConfig).includes(file.filename))
    console.error(`ERROR: Missing file url for the file: ${file.filename}`);

  if (!albums.some((album) => album.path === file.path))
    console.error(`ERROR: Missing album for the file path: ${file.path}`);

  if (!file.description)
    console.warn(
      `WARNING: Missing file description for the file: ${file.filename} (${file.path})`
    );
});

Object.keys(sourcesConfig).forEach((filename) => {
  if (!files.some((file) => file.filename === filename))
    console.error(
      `ERROR: Missing file for the url: ${filename}: ${sourcesConfig[filename].url}`
    );
});

albums.forEach((album) => {
  if (!files.some((file) => file.path === album.path) && !album.text)
    console.warn(
      `WARNING: Missing files and text for the album: ${album.path}`
    );
});
