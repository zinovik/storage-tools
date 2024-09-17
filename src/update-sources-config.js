const { GoogleAuth } = require('google-auth-library');

const UPDATE_SOURCES_CONFIG_URL =
    'https://gallery-api-306312319198.europe-central2.run.app/edit/update-sources-config';

(async () => {
    const auth = new GoogleAuth();
    const client = await auth.getIdTokenClient(UPDATE_SOURCES_CONFIG_URL);

    const { data } = await client.request({
        url: UPDATE_SOURCES_CONFIG_URL,
        method: 'POST',
    });

    console.log(data);
})();
