import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { EmployerOrg, EmployerOrgDocument } from '../schemas/employer-org.schema';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { EmailService } from '../common/services/email.service';

@Injectable()
export class EmployerOrgService {
  private readonly logger = new Logger(EmployerOrgService.name);

  constructor(
    @InjectModel(EmployerOrg.name)
    private employerOrgModel: Model<EmployerOrgDocument>,
    private readonly emailService: EmailService,
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

    const saved = await org.save();

    // Notify the invited teammate. The invite is already persisted, so any
    // email failure must not break the invite flow — log and continue.
    try {
      const savedInvites: any[] = (saved as any).invites || [];
      const newInvite = savedInvites[savedInvites.length - 1];
      const token = newInvite && newInvite._id ? newInvite._id.toString() : '';

      await this.emailService.sendOrgInviteEmail(dto.email, {
        orgName: saved.companyName,
        token,
        role: dto.role,
      });
    } catch (error: any) {
      this.logger.error(
        `Failed to send org invite email to ${dto.email}: ${error?.message}`,
      );
    }

    return saved;
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
