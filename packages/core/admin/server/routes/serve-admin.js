'use strict';

const path = require('path');
const fse = require('fs-extra');
const koaStatic = require('koa-static');

const serveAdmin = ({ strapi }) => {
  let buildDir = path.resolve(strapi.dirs.root, 'build');

  if (!fse.pathExistsSync(buildDir)) {
    buildDir = path.resolve(__dirname, '../../build');
  }

  const serveAdmin = async (ctx, next) => {
    await next();

    if (ctx.method !== 'HEAD' && ctx.method !== 'GET') {
      return;
    }

    if (ctx.body != null || ctx.status !== 404) {
      return;
    }

    ctx.type = 'html';
    ctx.body = fse.createReadStream(path.join(buildDir + '/index.html'));
  };

  strapi.server.routes([
    {
      method: 'GET',
      path: `${strapi.config.admin.path}/:path*`,
      handler: [
        serveAdmin,
        serveStatic(buildDir, { maxage: 60000, defer: false, index: 'index.html' }),
      ],
      config: { auth: false },
    },
  ]);
};

// serveStatic is not supposed to be used to serve a folder that have sub-folders
const serveStatic = (filesDir, koaStaticOptions = {}) => {
  const serve = koaStatic(filesDir, koaStaticOptions);

  return async (ctx, next) => {
    const prev = ctx.path;
    const newPath = path.basename(ctx.path);
    ctx.path = newPath;
    await serve(ctx, async () => {
      ctx.path = prev;
      await next();
      ctx.path = newPath;
    });
    ctx.path = prev;
  };
};

module.exports = serveAdmin;
