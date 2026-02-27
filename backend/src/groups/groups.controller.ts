import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { GroupsService } from './groups.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { AddUserToGroupDto } from './dto/add-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('groups')
@UseGuards(JwtAuthGuard)
export class GroupsController {
    constructor(private readonly groupsService: GroupsService) { }

    @Post()
    create(@Body() createGroupDto: CreateGroupDto, @Request() req) {
        return this.groupsService.create(createGroupDto, req.user);
    }

    @Get()
    findAll(@Request() req) {
        return this.groupsService.findAll(req.user);
    }

    @Get(':id')
    findOne(@Param('id') id: string, @Request() req) {
        return this.groupsService.findOne(id, req.user);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateGroupDto: UpdateGroupDto, @Request() req) {
        return this.groupsService.update(id, updateGroupDto, req.user);
    }

    @Delete(':id')
    remove(@Param('id') id: string, @Request() req) {
        return this.groupsService.remove(id, req.user);
    }

    @Get(':id/users')
    getMembers(@Param('id') id: string, @Request() req) {
        return this.groupsService.getMembers(id, req.user);
    }

    @Get(':id/tasks')
    getTasks(@Param('id') id: string, @Request() req) {
        return this.groupsService.getTasks(id, req.user);
    }

    @Post(':id/users')
    addUser(@Param('id') id: string, @Body() addUserDto: AddUserToGroupDto, @Request() req) {
        return this.groupsService.addUser(id, addUserDto.email, req.user);
    }

    @Delete(':id/users/:userId')
    removeUser(@Param('id') id: string, @Param('userId') userId: string, @Request() req) {
        return this.groupsService.removeUser(id, userId, req.user);
    }
}
