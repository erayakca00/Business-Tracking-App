import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { GroupsService } from './groups.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { AddUserToGroupDto } from './dto/add-user.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InvitationsService } from '../invitations/invitations.service';
import { InviteUserDto, AcceptInviteDto } from '../invitations/dto/invite.dto';

@Controller('groups')
export class GroupsController {
  constructor(
    private readonly groupsService: GroupsService,
    private readonly invitationsService: InvitationsService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() createGroupDto: CreateGroupDto, @Request() req) {
    return this.groupsService.create(createGroupDto, req.user);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(@Request() req) {
    return this.groupsService.findAll(req.user);
  }

  // Invitation endpoints (placed BEFORE :id to avoid route collision)
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

  // Original group endpoints (placed AFTER static paths to prevent parameter matching)
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string, @Request() req) {
    return this.groupsService.findOne(id, req.user);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id') id: string,
    @Body() updateGroupDto: UpdateGroupDto,
    @Request() req,
  ) {
    return this.groupsService.update(id, updateGroupDto, req.user);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string, @Request() req) {
    return this.groupsService.remove(id, req.user);
  }

  @Get(':id/users')
  @UseGuards(JwtAuthGuard)
  getMembers(@Param('id') id: string, @Request() req) {
    return this.groupsService.getMembers(id, req.user);
  }

  @Get(':id/tasks')
  @UseGuards(JwtAuthGuard)
  getTasks(
    @Param('id') id: string,
    @Request() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? Number.parseInt(page, 10) : undefined;
    const limitNum = limit ? Number.parseInt(limit, 10) : undefined;
    return this.groupsService.getTasks(id, req.user, pageNum, limitNum);
  }

  @Post(':id/users')
  @UseGuards(JwtAuthGuard)
  addUser(
    @Param('id') id: string,
    @Body() addUserDto: AddUserToGroupDto,
    @Request() req,
  ) {
    return this.groupsService.addUser(id, addUserDto.email, req.user);
  }

  @Delete(':id/users/:userId')
  @UseGuards(JwtAuthGuard)
  removeUser(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Request() req,
  ) {
    return this.groupsService.removeUser(id, userId, req.user);
  }

  @Patch(':id/users/:userId/role')
  @UseGuards(JwtAuthGuard)
  updateMemberRole(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateMemberRoleDto,
    @Request() req,
  ) {
    return this.groupsService.updateMemberRole(id, userId, dto.role, req.user);
  }

  @Post(':id/transfer-ownership/:userId')
  @UseGuards(JwtAuthGuard)
  transferOwnership(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Request() req,
  ) {
    return this.groupsService.transferOwnership(id, userId, req.user);
  }

  @Get(':id/analytics')
  @UseGuards(JwtAuthGuard)
  getAnalytics(@Param('id') id: string, @Request() req) {
    return this.groupsService.getAnalytics(id, req.user);
  }

  @Get(':id/time-report')
  @UseGuards(JwtAuthGuard)
  getTimeReport(@Param('id') id: string, @Request() req) {
    return this.groupsService.getTimeReport(id, req.user);
  }
}
