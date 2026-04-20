'use strict';

const path = require('path');

const root = path.join(__dirname, '..');
process.env.CACHE_DIR = path.join(root, '.gh-pages-cache');

const ghpages = require('gh-pages');

// Drop stale clone (e.g. remote gh-pages branch was deleted / recreated).
ghpages.clean();

ghpages.publish(
    path.join(root, 'dist'),
    {
        nojekyll: true
    },
    err => {
        if (err) {
            console.error(err);
            process.exit(1);
        }
        console.log('Published');
    }
);
