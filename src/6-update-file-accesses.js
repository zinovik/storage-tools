const { GoogleAuth } = require('google-auth-library');

const UPDATE_FILE_ACCESSES_URL =
    'https://gallery-api-306312319198.europe-central2.run.app/edit/update-file-accesses';

// const UPDATE_FILE_ACCESSES_URL = 'http://localhost:8080/edit/update-file-accesses';

(async () => {
    const auth = new GoogleAuth();
    const client = await auth.getIdTokenClient(UPDATE_FILE_ACCESSES_URL);

    const { data } = await client.request({
        url: UPDATE_FILE_ACCESSES_URL,
        method: 'POST',
    });

    console.log(data);
})();
