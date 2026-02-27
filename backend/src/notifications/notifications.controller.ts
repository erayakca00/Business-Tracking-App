import { Controller, Get, Patch, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
    constructor(private notificationsService: NotificationsService) { }

    @Get()
    async getUserNotifications(@Request() req) {
        return this.notificationsService.getUserNotifications(req.user.id);
    }

    @Get('unread-count')
    async getUnreadCount(@Request() req) {
        const count = await this.notificationsService.getUnreadCount(req.user.id);
        return { count };
    }

    @Patch(':id/read')
    async markAsRead(@Param('id') id: string, @Request() req) {
        return this.notificationsService.markAsRead(id, req.user.id);
    }

    @Patch('read-all')
    async markAllAsRead(@Request() req) {
        await this.notificationsService.markAllAsRead(req.user.id);
        return { success: true };
    }
}
