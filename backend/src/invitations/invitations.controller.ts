import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { InvitationsService } from './invitations.service';
import { InviteUserDto, AcceptInviteDto } from './dto/invite.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('groups')
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Post('invite/accept')
  @UseGuards(JwtAuthGuard)
  async acceptInvitation(
    @Body() acceptInviteDto: AcceptInviteDto,
    @Request() req,
  ) {
    return this.invitationsService.acceptInvitation(
      acceptInviteDto.token,
      req.user,
    );
  }

  @Get('invite/details')
  async getInviteDetails(@Query('token') token: string) {
    return this.invitationsService.getInviteDetails(token);
  }

  @Get('my-invitations')
  @UseGuards(JwtAuthGuard)
  async getMyPendingInvitations(@Request() req) {
    return this.invitationsService.getMyPendingInvitations(req.user);
  }

  @Post('my-invitations/:id/decline')
  @UseGuards(JwtAuthGuard)
  async declineInvitation(@Param('id') id: string, @Request() req) {
    return this.invitationsService.declineInvitation(id, req.user);
  }

  @Post(':groupId/invite')
  @UseGuards(JwtAuthGuard)
  async invite(
    @Param('groupId') groupId: string,
    @Body() inviteUserDto: InviteUserDto,
    @Request() req,
  ) {
    return this.invitationsService.invite(
      groupId,
      inviteUserDto.email,
      req.user,
    );
  }

  @Get(':groupId/invitations')
  @UseGuards(JwtAuthGuard)
  async getInvitations(@Param('groupId') groupId: string, @Request() req) {
    return this.invitationsService.getInvitations(groupId, req.user);
  }

  @Delete(':groupId/invitations/:id')
  @UseGuards(JwtAuthGuard)
  async revokeInvitation(
    @Param('groupId') groupId: string,
    @Param('id') invitationId: string,
    @Request() req,
  ) {
    await this.invitationsService.revokeInvitation(
      groupId,
      invitationId,
      req.user,
    );
    return { message: 'Invitation revoked.' };
  }
}
