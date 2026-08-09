import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  QuestionCatalog,
  QuestionCatalogDocument,
} from '../schemas/question-catalog.schema';
import { QUESTION_CATALOG_SEED } from './question-catalog.seed';

/**
 * Owns the global question catalog.
 *
 * Seeds on boot, idempotently: seeded rows are upserted by `questionKey`, so
 * editing the seed file updates the catalog on the next deploy while rows added
 * later by operators are left alone.
 */
@Injectable()
export class QuestionCatalogService implements OnModuleInit {
  private readonly logger = new Logger(QuestionCatalogService.name);

  constructor(
    @InjectModel(QuestionCatalog.name)
    private readonly catalogModel: Model<QuestionCatalogDocument>,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.seed();
    } catch (err) {
      // A catalog that fails to seed degrades answer coverage; it must not stop
      // the app from booting.
      this.logger.error(
        `Question catalog seeding failed: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  /** Upsert every seeded question. Safe to run repeatedly. */
  async seed(): Promise<{ upserted: number }> {
    let upserted = 0;

    for (const q of QUESTION_CATALOG_SEED) {
      await this.catalogModel
        .updateOne(
          { questionKey: q.questionKey },
          {
            $set: {
              canonicalText: q.canonicalText,
              patterns: q.patterns,
              questionClass: q.questionClass,
              profileField: q.profileField,
              countryScoped: !!q.countryScoped,
              active: true,
            },
          },
          { upsert: true },
        )
        .exec();
      upserted += 1;
    }

    this.logger.log(`Question catalog seeded (${upserted} questions).`);
    return { upserted };
  }

  async listActive(): Promise<QuestionCatalogDocument[]> {
    return this.catalogModel.find({ active: { $ne: false } }).exec();
  }
}
