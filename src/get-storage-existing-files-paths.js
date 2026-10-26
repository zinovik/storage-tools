const getStorageExistingFiles = async (bucket, versions) => {
    console.log('Get storage exiting files...');
    console.time('Get storage exiting files');

    const [exitingFiles] = await bucket.getFiles(
        versions ? { versions } : undefined
    );
    console.timeEnd('Get storage exiting files');

    return exitingFiles;
};

const getStorageExitingFilesPaths = async (bucket) => {
    const exitingFiles = await getStorageExistingFiles(bucket);

    const result = exitingFiles.map((exitingFile) => exitingFile.name);

    return result;
};

module.exports = {
    getStorageExistingFiles,
    getStorageExitingFilesPaths,
};
