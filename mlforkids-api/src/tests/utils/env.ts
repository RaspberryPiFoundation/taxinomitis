/*eslint-env mocha */
import * as assert from 'assert';

import * as env from '../../lib/utils/env';



describe('Utils - env', () => {

    let oldDBHost: string | undefined;
    let oldDBUser: string | undefined;

    before(() => {
        oldDBHost = process.env.POSTGRESQLHOST;
        oldDBUser = process.env.POSTGRESQLUSER;
    });
    after(() => {
        process.env.POSTGRESQLHOST = oldDBHost;
        process.env.POSTGRESQLUSER = oldDBUser;
    });

    it('should pass if variables are present', () => {
        process.env.POSTGRESQLHOST = 'creds';
        process.env.POSTGRESQLUSER = 'bucket';

        env.confirmRequiredEnvironment();
    });

    it('should fail if variables are missing', (done) => {
        delete process.env.POSTGRESQLUSER;

        try {
            env.confirmRequiredEnvironment();
        }
        catch (err) {
            assert.strictEqual(err.message, 'Missing required environment variable POSTGRESQLUSER');
            done();
        }
    });

    describe('accountsEnabled', () => {

        let oldAccountsEnabled: string | undefined;

        before(() => {
            oldAccountsEnabled = process.env.ACCOUNTS_ENABLED;
        });
        after(() => {
            if (oldAccountsEnabled === undefined) {
                delete process.env.ACCOUNTS_ENABLED;
            }
            else {
                process.env.ACCOUNTS_ENABLED = oldAccountsEnabled;
            }
        });

        it('should be enabled by default when the variable is not set', () => {
            delete process.env.ACCOUNTS_ENABLED;
            assert.strictEqual(env.accountsEnabled(), true);
        });

        it('should be disabled only when explicitly set to false', () => {
            process.env.ACCOUNTS_ENABLED = 'false';
            assert.strictEqual(env.accountsEnabled(), false);
        });

        it('should be enabled for any other value', () => {
            process.env.ACCOUNTS_ENABLED = 'true';
            assert.strictEqual(env.accountsEnabled(), true);

            process.env.ACCOUNTS_ENABLED = '';
            assert.strictEqual(env.accountsEnabled(), true);

            process.env.ACCOUNTS_ENABLED = 'no';
            assert.strictEqual(env.accountsEnabled(), true);
        });
    });

});


