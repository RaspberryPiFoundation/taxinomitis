/* eslint no-console: 0 */
/* tslint:disable: no-console max-line-length */
import * as store from '../lib/db/store';

const opsArgs = process.argv.slice(2);

if (opsArgs.length !== 2) {
    console.log('usage: node set-tenant-maxusers.js tenantid maxusers');
    process.exit(-1); // eslint-disable-line
}

const tenantid = opsArgs[0];
const maxusers = parseInt(opsArgs[1], 10);

console.log('tenant    :', tenantid);
console.log('max users :', maxusers);

console.log('');
console.log('connecting to DB...');
store.init()
    .then(() => {
        console.log('updating tenant max users...');
        return store.modifyClassTenantMaxUsers(tenantid, maxusers);
    })
    .then((tenant) => {
        console.log('done:', tenant);
    })
    .catch((err) => {
        console.error(err);
    })
    .finally(() => {
        return store.disconnect();
    });
