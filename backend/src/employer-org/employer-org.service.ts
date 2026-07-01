import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { EmployerOrg, EmployerOrgDocument } from '../schemas/employer-org.schema';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';

@Injectable()
export class EmployerOrgService {
  constructor(
    @InjectModel(EmployerOrg.name)
    private employerOrgModel: Model<EmployerOrgDocument>,
  ) {}

  async getOrCreateOrg(ownerId: string): Promise<EmployerOrgDocument> {
    const org = await this.employerOrgModel.findOneAndUpdate(
      { ownerId: new Types.ObjectId(ownerId) },
      {
        $setOnInsert: {
          ownerId: new Types.ObjectId(ownerId),
          companyName: '',
          members: [],
          invites: [],
        },
      },
      { upsert: true, new: true },
    );

    return org;
  }

  async inviteMember(
    ownerId: string,
    dto: InviteMemberDto,
  ): Promise<EmployerOrgDocument> {
    const org = await this.getOrCreateOrg(ownerId);

    org.members = org.members || [];
    org.invites = org.invites || [];

    org.members.push({
      email: dto.email,
      role: dto.role,
      status: 'invited',
    });

    org.invites.push({
      email: dto.email,
      role: dto.role,
      invitedAt: new Date(),
    });

    return org.save();
  }

  async updateMemberRole(
    ownerId: string,
    memberId: string,
    dto: UpdateMemberRoleDto,
  ): Promise<EmployerOrgDocument> {
    const org = await this.getOrCreateOrg(ownerId);

    const member = (org.members || []).find(
      (m: any) => m._id && m._id.toString() === memberId,
    );

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    member.role = dto.role;

    return org.save();
  }

  async removeMember(
    ownerId: string,
    memberId: string,
  ): Promise<EmployerOrgDocument> {
    const org = await this.getOrCreateOrg(ownerId);

    const members = org.members || [];
    const exists = members.some(
      (m: any) => m._id && m._id.toString() === memberId,
    );

    if (!exists) {
      throw new NotFoundException('Member not found');
    }

    org.members = members.filter(
      (m: any) => !(m._id && m._id.toString() === memberId),
    );

    return org.save();
  }
}
