import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  EmployerApproval,
  EmployerApprovalDocument,
} from './schemas/employer-approval.schema';
import { CreateApprovalDto } from './dto/create-approval.dto';
import { DecisionDto } from './dto/decision.dto';

const DECISION_STATE: Record<string, string> = {
  approve: 'approved',
  reject: 'rejected',
  changes: 'changes',
};

@Injectable()
export class EmployerApprovalsService {
  constructor(
    @InjectModel(EmployerApproval.name)
    private approvalModel: Model<EmployerApprovalDocument>,
  ) {}

  async list(ownerId: string): Promise<EmployerApprovalDocument[]> {
    return this.approvalModel
      .find({ ownerId: new Types.ObjectId(ownerId) })
      .sort({ createdAt: -1 })
      .exec();
  }

  async create(
    ownerId: string,
    dto: CreateApprovalDto,
  ): Promise<EmployerApprovalDocument> {
    const approval = new this.approvalModel({
      ownerId: new Types.ObjectId(ownerId),
      title: dto.title,
      team: dto.team || '',
      location: dto.location || '',
      type: dto.type || '',
      level: dto.level || '',
      requester: dto.requester || '',
      fields: dto.fields || [],
      chain: (dto.chain || []).map((c) => ({
        name: c.name,
        role: c.role || '',
        state: c.state || 'pending',
        note: c.note || '',
      })),
      status: 'pending',
    });
    return approval.save();
  }

  async decide(
    ownerId: string,
    id: string,
    dto: DecisionDto,
  ): Promise<EmployerApprovalDocument> {
    const approval = await this.approvalModel
      .findOne({ _id: id, ownerId: new Types.ObjectId(ownerId) })
      .exec();
    if (!approval) {
      throw new NotFoundException('Approval not found');
    }

    const chain = approval.chain || [];
    let idx = -1;
    if (typeof dto.step === 'number' && chain[dto.step]) {
      idx = dto.step;
    } else {
      idx = chain.findIndex((c) => c.state === 'pending');
      if (idx === -1 && dto.role) {
        idx = chain.findIndex((c) => c.role === dto.role);
      }
    }

    if (idx >= 0 && chain[idx]) {
      chain[idx].state = DECISION_STATE[dto.decision] || 'pending';
      chain[idx].note = dto.note || '';
    }

    approval.chain = chain;
    approval.status = this.computeStatus(chain);
    approval.markModified('chain');
    return approval.save();
  }

  private computeStatus(
    chain: Array<{ state: string }>,
  ): string {
    if (chain.some((c) => c.state === 'rejected')) {
      return 'rejected';
    }
    if (chain.some((c) => c.state === 'changes')) {
      return 'changes';
    }
    if (chain.length > 0 && chain.every((c) => c.state === 'approved')) {
      return 'approved';
    }
    return 'pending';
  }
}
