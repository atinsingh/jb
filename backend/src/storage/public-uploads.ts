import { NestExpressApplication } from '@nestjs/platform-express';
import { isAbsolute, posix, relative, resolve, sep } from 'path';
import { realpath } from 'fs/promises';

const PRIVATE_DIRS = ['resume-harness', 'resumes'];

function isPrivateUploadPath(path: string): boolean {
  const head = path.split('/').filter(Boolean)[0]?.toLowerCase();
  return head === 'resume-harness' || head === 'resumes';
}

function isInside(privateRoot: string, target: string): boolean {
  const location = relative(privateRoot, target);
  return (
    !location ||
    (!location.startsWith(`..${sep}`) && location !== '..' && !isAbsolute(location))
  );
}

/** The local driver's public upload route. Résumé objects stay off it. */
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
    if (isPrivateUploadPath(path)) {
      res.sendStatus(404);
      return;
    }
    try {
      // Resolve junctions and NTFS 8.3 names before checking containment.
      const target = await realpath(resolve(root, `.${path}`));
      for (const dir of PRIVATE_DIRS) {
        let privateRoot: string;
        try {
          privateRoot = await realpath(resolve(root, dir));
        } catch (error) {
          if (error.code === 'ENOENT' || error.code === 'ENOTDIR') continue;
          throw error;
        }
        if (isInside(privateRoot, target)) {
          res.sendStatus(404);
          return;
        }
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
