import { describe, it, before, after, beforeEach } from 'node:test';
import * as assert from 'assert';

import * as config from '../../lib/restapi/config';


describe('REST API - index.html runtime config', () => {

    const VARS = [ 'ACCOUNTS_ENABLED', 'CLOUDFLARE_TURNSTILE_SITE_KEY', 'PLAUSIBLE_SOURCE' ];
    const oldValues: { [name: string]: string | undefined } = {};

    // the Cabin script tag as it appears in the source index.html, and after the build has minified it
    const CABIN_SOURCE = '<script async defer src="https://scripts.withcabin.com/hello.js"></script>';
    const CABIN_MINIFIED = '<script async defer="defer" src="https://scripts.withcabin.com/hello.js"></script>';

    function page(body: string): string {
        return '<html><head><title>test</title></head><body>' + body + '</body></html>';
    }

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
    beforeEach(() => {
        for (const name of VARS) {
            delete process.env[name];
        }
    });


    it('adds the runtime config before the end of the head', () => {
        process.env.ACCOUNTS_ENABLED = 'false';
        process.env.CLOUDFLARE_TURNSTILE_SITE_KEY = 'site-key';

        const html = config.injectRuntimeConfig(page('')) as string;

        assert.match(html, /<script>window\.ACCOUNTS_ENABLED = false;.*window\.TURNSTILE_SITE_KEY = "site-key";<\/script><\/head>/);
    });

    it('returns undefined without a head to add to', () => {
        assert.strictEqual(config.injectRuntimeConfig('<html><body></body></html>'), undefined);
    });

    describe('Plausible', () => {

        it('is left out without a script', () => {
            const html = config.injectRuntimeConfig(page('')) as string;
            assert.doesNotMatch(html, /plausible/);
        });

        it('loads the script and turns on hash-based routing', () => {
            process.env.PLAUSIBLE_SOURCE = 'https://plausible.io/js/pa-abc123.js';

            const html = config.injectRuntimeConfig(page('')) as string;

            assert(html.includes('<script async src="https://plausible.io/js/pa-abc123.js"></script>'));
            assert(html.includes('plausible.init({hashBasedRouting:true});'));
            assert(html.indexOf('pa-abc123.js') < html.indexOf('</head>'));
        });

        it('escapes the script URL for the attribute', () => {
            process.env.PLAUSIBLE_SOURCE = 'https://plausible.io/js/pa-abc123.js?a=1&b="2"';

            const html = config.injectRuntimeConfig(page('')) as string;

            assert(html.includes('src="https://plausible.io/js/pa-abc123.js?a=1&amp;b=%222%22"'));
        });

        it('keeps "$" in the script URL as it is', () => {
            process.env.PLAUSIBLE_SOURCE = 'https://plausible.io/js/pa-$$abc.js';

            const html = config.injectRuntimeConfig(page('')) as string;

            assert(html.includes('src="https://plausible.io/js/pa-$$abc.js"'));
        });
    });

    describe('Cabin', () => {

        it('is removed when accounts are disabled', () => {
            process.env.ACCOUNTS_ENABLED = 'false';

            for (const tag of [ CABIN_SOURCE, CABIN_MINIFIED ]) {
                const html = config.injectRuntimeConfig(page('<p>content</p>' + tag)) as string;

                assert.doesNotMatch(html, /withcabin/);
                assert(html.includes('<p>content</p>'));
            }
        });

        it('is kept when accounts are enabled', () => {
            const html = config.injectRuntimeConfig(page(CABIN_MINIFIED)) as string;

            assert(html.includes(CABIN_MINIFIED));
        });
    });
});
