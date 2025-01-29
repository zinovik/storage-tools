module.exports = {
    performBatch: async (args, perform, batchSize, logName) => {
        const results = [];

        for (let i = 0; i < args.length; i += batchSize) {
            console.log(`- ${logName} batch starting from ${i}`);
            const promises = args
                .slice(i, i + batchSize)
                .map(async (arg) => await perform(arg));

            const resultsPart = await Promise.all(promises);

            results.push(...resultsPart);
        }
        console.log(`- ${logName} batch done`);

        return results;
    },
};
