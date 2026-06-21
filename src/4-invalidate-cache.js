const { GoogleAuth } = require('google-auth-library');

const INVALIDATE_CACHE_URL =
    'https://gallery-api-278546267214.europe-central2.run.app/invalidate-cache';

// const INVALIDATE_CACHE_URL = 'http://localhost:8080/invalidate-cache';

(async () => {
    const auth = new GoogleAuth();
    const client = await auth.getIdTokenClient(INVALIDATE_CACHE_URL);

    const { data } = await client.request({
        url: INVALIDATE_CACHE_URL,
        method: 'POST',
    });

    console.log(data);
})();
