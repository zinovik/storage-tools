const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');

const SOURCES_CONFIG = './sources-config.json';

const isVideo = (filename) =>
  ['mp4'].some((ext) => filename.endsWith(`.${ext}`));

(async () => {
  console.log('Getting sources...');
  const { stdout: megaExportOutput } = await promisify(exec)(`mega-export`);

  const regex = new RegExp('\\/([^ \\/]+) \\(.*(https.*) ', 'g');

  const sourcesConfig = JSON.parse(fs.readFileSync(SOURCES_CONFIG).toString());

  let currentMatch;
  let megaLinksCount = 0;
  while ((currentMatch = regex.exec(megaExportOutput))) {
    sourcesConfig[currentMatch[1]] = {
      url: currentMatch[2].replace('/file/', '/embed/'),
      type: isVideo(currentMatch[1]) ? 'video' : 'image',
    };
    megaLinksCount++;
  }

  console.log('Writing file...');
  fs.writeFileSync(SOURCES_CONFIG, JSON.stringify(sourcesConfig));
  console.log(
    `Total sources: ${megaLinksCount}/${Object.keys(sourcesConfig).length}`
  );

  console.log('Formatting file...');
  await promisify(exec)(`npx prettier ${SOURCES_CONFIG} --write`);

  console.log('Done!');
})();
