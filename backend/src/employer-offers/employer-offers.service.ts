import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  EmployerOffer,
  EmployerOfferDocument,
} from './schemas/employer-offer.schema';
import { CreateOfferDto } from './dto/create-offer.dto';
import { UpdateOfferDto } from './dto/update-offer.dto';

@Injectable()
export class EmployerOffersService {
  constructor(
    @InjectModel(EmployerOffer.name)
    private employerOfferModel: Model<EmployerOfferDocument>,
  ) {}

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
    const offer = new this.employerOfferModel({
      ...dto,
      ownerId,
      status: dto.status || 'draft',
    });
    return offer.save();
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
    return offer.save();
  }
}
