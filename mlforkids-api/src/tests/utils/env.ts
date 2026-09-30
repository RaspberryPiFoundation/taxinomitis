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

    describe('Turnstile keys', () => {

        const VARS = [ 'ACCOUNTS_ENABLED', 'CLOUDFLARE_TURNSTILE_SITE_KEY', 'CLOUDFLARE_TURNSTILE_SECRET_KEY' ];
        const oldValues: { [name: string]: string | undefined } = {};

        before(() => {
            for (const name of VARS) {
                oldValues[name] = process.env[name];
            }
        });
        after(() => {
            for (const name of VARS) {
                if (oldValues[name] === undefined) {
                    delete process.env[name];
                }
                else {
                    process.env[name] = oldValues[name];
                }
            }
        });

        function setDatabaseVars() {
            process.env.POSTGRESQLHOST = 'localhost';
            process.env.POSTGRESQLPORT = '5432';
            process.env.POSTGRESQLUSER = 'postgres';
            process.env.POSTGRESQLDATABASE = 'mlforkids';
        }

        it('should be required when accounts are disabled', () => {
            setDatabaseVars();
            process.env.ACCOUNTS_ENABLED = 'false';
            delete process.env.CLOUDFLARE_TURNSTILE_SITE_KEY;
            delete process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY;

            assert.throws(
                () => env.confirmRequiredEnvironment(),
                { message: 'Missing required environment variable CLOUDFLARE_TURNSTILE_SITE_KEY' }
            );

            process.env.CLOUDFLARE_TURNSTILE_SITE_KEY = 'site-key';
            assert.throws(
                () => env.confirmRequiredEnvironment(),
                { message: 'Missing required environment variable CLOUDFLARE_TURNSTILE_SECRET_KEY' }
            );

            process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY = 'secret-key';
            env.confirmRequiredEnvironment();
        });

        it('should not be required when accounts are enabled', () => {
            setDatabaseVars();
            delete process.env.ACCOUNTS_ENABLED;
            delete process.env.CLOUDFLARE_TURNSTILE_SITE_KEY;
            delete process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY;

            env.confirmRequiredEnvironment();
        });

        it('should return the site key for the front-end', () => {
            delete process.env.CLOUDFLARE_TURNSTILE_SITE_KEY;
            assert.strictEqual(env.getTurnstileSiteKey(), undefined);

            process.env.CLOUDFLARE_TURNSTILE_SITE_KEY = 'site-key';
            assert.strictEqual(env.getTurnstileSiteKey(), 'site-key');
        });
    });

});



