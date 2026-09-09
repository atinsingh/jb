import { NestExpressApplication } from '@nestjs/platform-express';
import { isAbsolute, posix, relative, resolve, sep } from 'path';
import { realpath } from 'fs/promises';

/** The local driver's public upload route. */
export function servePublicUploads(
  app: NestExpressApplication,
  root: string,
): void {
  app.use('/uploads', async (req, res, next) => {
    let path: string;
    try {
      path = posix.normalize(decodeURIComponent(req.path).replace(/\\/g, '/'));
    } catch {
      res.sendStatus(400);
      return;
    }
    if (
      path.split('/').filter(Boolean)[0]?.toLowerCase() === 'resume-harness'
    ) {
      res.sendStatus(404);
      return;
    }
    try {
      const [target, privateRoot] = await Promise.all([
        realpath(resolve(root, `.${path}`)),
        realpath(resolve(root, 'resume-harness')),
      ]);
      // Resolve junctions and NTFS 8.3 names before checking containment.
      // `relative` also handles filesystem case rules on Windows.
      const location = relative(privateRoot, target);
      if (
        !location ||
        (!location.startsWith(`..${sep}`) &&
          location !== '..' &&
          !isAbsolute(location))
      ) {
        res.sendStatus(404);
        return;
      }
    } catch (error) {
      if (error.code !== 'ENOENT' && error.code !== 'ENOTDIR') {
        next(error);
        return;
      }
    }
    next();
  });
  app.useStaticAssets(root, { prefix: '/uploads/' });
}
