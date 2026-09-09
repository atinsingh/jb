import { Test } from '@nestjs/testing';
import { NestExpressApplication } from '@nestjs/platform-express';
import { access, mkdtemp, mkdir, writeFile, rm, symlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import request = require('supertest');
import { servePublicUploads } from './public-uploads';

describe('Local upload privacy', () => {
  it('serves public uploads while excluding saved resume PDFs, including encoded paths', async () => {
    const root = await mkdtemp(join(tmpdir(), 'resume-upload-privacy-'));
    const module = await Test.createTestingModule({}).compile();
    const app = module.createNestApplication<NestExpressApplication>();
    try {
      await mkdir(join(root, 'resume-harness', 'user'), { recursive: true });
      await writeFile(
        join(root, 'resume-harness', 'user', '1.pdf'),
        '%PDF private',
      );
      await writeFile(join(root, 'public.txt'), 'public');
      servePublicUploads(app, root);
      await app.init();
      await request(app.getHttpServer())
        .get('/uploads/public.txt')
        .expect(200, 'public');
      for (const path of [
        '/uploads/resume-harness/user/1.pdf',
        '/uploads/%72esume-harness/user/1.pdf',
        '/uploads/resume-harness%2fuser%2f1.pdf',
        '/uploads/RESUME-HARNESS/user/1.pdf',
      ]) {
        await request(app.getHttpServer()).get(path).expect(404);
      }
      // A filesystem alias must not make a private artifact public. A junction
      // works on Windows without requiring symlink privileges.
      await symlink(
        join(root, 'resume-harness'),
        join(root, 'alias'),
        'junction',
      );
      await request(app.getHttpServer())
        .get('/uploads/alias/user/1.pdf')
        .expect(404);
      if (process.platform === 'win32') {
        const shortPath = join(root, 'RESUME~1', 'user', '1.pdf');
        const shortNamesEnabled = await access(shortPath).then(
          () => true,
          (error) => {
            if (error.code === 'ENOENT') return false;
            throw error;
          },
        );
        if (shortNamesEnabled) {
          await request(app.getHttpServer())
            .get('/uploads/RESUME~1/user/1.pdf')
            .expect(404);
          await request(app.getHttpServer())
            .get('/uploads/%52ESUME~1/user/1.pdf')
            .expect(404);
        }
      }
    } finally {
      await app.close();
      await rm(root, { recursive: true, force: true });
    }
  });
});
