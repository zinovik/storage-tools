const { GoogleAuth } = require('google-auth-library');

const URL = 'https://gallery-api-278546267214.europe-central2.run.app';
const LOCAL_URL = 'http://localhost:8080';

(async () => {
    const auth = new GoogleAuth();
    const client = await auth.getIdTokenClient(URL);

    const { data } = await client.request({
        url: `${URL}/resolve-new-storage-files`,
        method: 'POST',
    });

    console.log('cloud run:');
    console.log(data);
})();

(async () => {
    try {
        const auth = new GoogleAuth();
        const client = await auth.getIdTokenClient(LOCAL_URL);

        const { data } = await client.request({
            url: `${LOCAL_URL}/resolve-new-storage-files`,
            method: 'POST',
        });

        console.log('local:');
        console.log(data);
    } catch {
        console.log('local server is not running');
    }
})();
