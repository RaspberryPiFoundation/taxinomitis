import { describe, it, before, after } from 'node:test';
import * as assert from 'assert';

import * as env from '../../lib/utils/env';



describe('Utils - env', () => {

    let oldDBHost: string | undefined;
    let oldDBPort: string | undefined;
    let oldDBUser: string | undefined;
    let oldDBDatabase: string | undefined;

    before(() => {
        oldDBHost = process.env.POSTGRESQLHOST;
        oldDBPort = process.env.POSTGRESQLPORT;
        oldDBUser = process.env.POSTGRESQLUSER;
        oldDBDatabase = process.env.POSTGRESQLDATABASE;
    });
    after(() => {
        process.env.POSTGRESQLHOST = oldDBHost;
        process.env.POSTGRESQLPORT = oldDBPort;
        process.env.POSTGRESQLUSER = oldDBUser;
        process.env.POSTGRESQLDATABASE = oldDBDatabase;
    });

    it('should pass if variables are present', () => {
        process.env.POSTGRESQLHOST = 'localhost';
        process.env.POSTGRESQLPORT = '5432';
        process.env.POSTGRESQLUSER = 'postgres';
        process.env.POSTGRESQLDATABASE = 'mlforkids';

        env.confirmRequiredEnvironment();
    });

    it('should fail if variables are missing', () => {
        process.env.POSTGRESQLHOST = 'localhost';
        process.env.POSTGRESQLPORT = '5432';
        delete process.env.POSTGRESQLUSER;
        process.env.POSTGRESQLDATABASE = 'mlforkids';

        assert.throws(
            () => env.confirmRequiredEnvironment(),
            { message: 'Missing required environment variable POSTGRESQLUSER' }
        );
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



