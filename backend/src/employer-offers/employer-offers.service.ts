import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  EmployerOffer,
  EmployerOfferDocument,
} from './schemas/employer-offer.schema';
import { CreateOfferDto } from './dto/create-offer.dto';
import { UpdateOfferDto } from './dto/update-offer.dto';
import { NotificationsService } from '../notifications/notifications.service';
import {
  EmployerApplicant,
  EmployerApplicantDocument,
} from '../employer-pipeline/schemas/employer-applicant.schema';

@Injectable()
export class EmployerOffersService {
  constructor(
    @InjectModel(EmployerOffer.name)
    private employerOfferModel: Model<EmployerOfferDocument>,
    @InjectModel(EmployerApplicant.name)
    private employerApplicantModel: Model<EmployerApplicantDocument>,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Resolve the real candidate (User) id from a linked EmployerApplicant.
   * Defensive: a missing/unlinked applicant simply yields undefined and never
   * fails the create flow.
   */
  private async resolveCandidateId(
    applicantId?: string,
  ): Promise<Types.ObjectId | undefined> {
    if (!applicantId) {
      return undefined;
    }
    try {
      const applicant = await this.employerApplicantModel
        .findById(applicantId)
        .exec();
      return (applicant?.candidateId as Types.ObjectId) || undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Producers for an offer event. Always notifies the employer (owner). Also
   * notifies the candidate when the offer document carries a candidateId
   * (candidate has no dedicated 'offers' type → mapped to 'applications').
   */
  private async notifyOffer(
    offer: EmployerOfferDocument,
    verb: string,
  ): Promise<void> {
    try {
      if (offer.ownerId) {
        await this.notificationsService.create({
          audience: 'employer',
          userId: String(offer.ownerId),
          type: 'offers',
          text: `Offer ${verb}${offer.candidateName ? ` for ${offer.candidateName}` : ''}`,
          href: '/employer/offers',
        });
      }
      const candidateId = (offer as any).candidateId;
      if (candidateId) {
        await this.notificationsService.create({
          audience: 'candidate',
          userId: String(candidateId),
          type: 'applications',
          text: `You have an offer (${verb})`,
          href: '/app/applications',
        });
      }
    } catch {
      /* notifications must never break the offer flow */
    }
  }

  async findAll(
    ownerId: string,
    status?: string,
  ): Promise<EmployerOfferDocument[]> {
    const query: any = { ownerId };
    if (status) {
      query.status = status;
    }
    return this.employerOfferModel.find(query).sort({ createdAt: -1 }).exec();
  }

  async create(
    ownerId: string,
    dto: CreateOfferDto,
  ): Promise<EmployerOfferDocument> {
    const candidateId = await this.resolveCandidateId(dto.applicantId);
    const offer = new this.employerOfferModel({
      ...dto,
      ownerId,
      ...(candidateId ? { candidateId } : {}),
      status: dto.status || 'draft',
    });
    const saved = await offer.save();
    await this.notifyOffer(saved, 'created');
    return saved;
  }

  async findOne(
    ownerId: string,
    id: string,
  ): Promise<EmployerOfferDocument> {
    const offer = await this.employerOfferModel.findOne({ _id: id, ownerId }).exec();
    if (!offer) {
      throw new NotFoundException('Offer not found');
    }
    return offer;
  }

  async update(
    ownerId: string,
    id: string,
    dto: UpdateOfferDto,
  ): Promise<EmployerOfferDocument> {
    const offer = await this.employerOfferModel.findOneAndUpdate(
      { _id: id, ownerId },
      { $set: dto },
      { new: true },
    );
    if (!offer) {
      throw new NotFoundException('Offer not found');
    }
    return offer;
  }

  async updateStatus(
    ownerId: string,
    id: string,
    status: string,
  ): Promise<EmployerOfferDocument> {
    const offer = await this.employerOfferModel.findOne({ _id: id, ownerId });
    if (!offer) {
      throw new NotFoundException('Offer not found');
    }
    offer.status = status;
    if (status === 'sent' && !offer.sentAt) {
      offer.sentAt = new Date();
    }
    const saved = await offer.save();
    await this.notifyOffer(saved, status);
    return saved;
  }
}
