import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskAttachment } from '../database/entities/task-attachment.entity';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { TasksService } from '../tasks/tasks.service';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AttachmentsService {
  private readonly s3Client: S3Client | null = null;
  private readonly bucketName: string | null = null;
  private readonly publicUrl: string | null = null;

  constructor(
    @InjectRepository(TaskAttachment)
    private readonly attachmentRepository: Repository<TaskAttachment>,
    @Inject(forwardRef(() => TasksService))
    private readonly tasksService: TasksService,
  ) {
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    const endpoint = process.env.R2_ENDPOINT;
    this.bucketName = process.env.R2_BUCKET_NAME || null;
    this.publicUrl = process.env.R2_PUBLIC_URL || null;

    if (accessKeyId && secretAccessKey && endpoint && this.bucketName) {
      this.s3Client = new S3Client({
        region: 'auto',
        endpoint: endpoint,
        credentials: {
          accessKeyId: accessKeyId,
          secretAccessKey: secretAccessKey,
        },
      });
      console.log(
        '[R2 Storage] Cloudflare R2 storage client successfully initialized.',
      );
    } else {
      console.log(
        '[R2 Storage] Cloudflare R2 credentials missing. Operating in [LOCAL DISK STORAGE] fallback mode.',
      );
    }
  }

  async createAttachment(
    taskId: string,
    userId: string,
    file: Express.Multer.File,
  ): Promise<TaskAttachment> {
    const fileExtension = path.extname(file.originalname);
    const uniqueFilename = `${uuidv4()}${fileExtension}`;
    let fileUrl = '';

    if (this.s3Client && this.bucketName) {
      try {
        await this.s3Client.send(
          new PutObjectCommand({
            Bucket: this.bucketName,
            Key: uniqueFilename,
            Body: file.buffer,
            ContentType: file.mimetype,
          }),
        );

        if (this.publicUrl) {
          const cleanUrl = this.publicUrl.endsWith('/')
            ? this.publicUrl.slice(0, -1)
            : this.publicUrl;
          fileUrl = `${cleanUrl}/${uniqueFilename}`;
        } else {
          fileUrl = `${process.env.R2_ENDPOINT}/${this.bucketName}/${uniqueFilename}`;
        }
        console.log(
          `[R2 Upload] File uploaded successfully to R2. URL: ${fileUrl}`,
        );
      } catch (err) {
        console.error(
          '[R2 Upload] Failed to upload to Cloudflare R2. Falling back to local disk:',
          err,
        );
        fileUrl = await this.saveToLocalDisk(file, uniqueFilename);
      }
    } else {
      fileUrl = await this.saveToLocalDisk(file, uniqueFilename);
    }

    const attachment = this.attachmentRepository.create({
      taskId,
      userId,
      filename: uniqueFilename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      url: fileUrl,
    });

    const savedAttachment = await this.attachmentRepository.save(attachment);
    await this.tasksService.logActivity(
      taskId,
      userId,
      'attachment_added' as any,
      { to: file.originalname },
    );
    return savedAttachment;
  }

  private async saveToLocalDisk(
    file: Express.Multer.File,
    filename: string,
  ): Promise<string> {
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    const filePath = path.join(uploadDir, filename);
    await fs.promises.writeFile(filePath, file.buffer);
    console.log(`[Local Upload] File saved to disk: ${filePath}`);
    return `/uploads/${filename}`;
  }

  async findByTaskId(taskId: string): Promise<TaskAttachment[]> {
    return this.attachmentRepository.find({
      where: { taskId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<TaskAttachment> {
    const attach = await this.attachmentRepository.findOne({
      where: { id },
      relations: ['user'],
    });
    if (!attach) throw new NotFoundException('Attachment not found');
    return attach;
  }

  async deleteAttachment(id: string, user: any): Promise<void> {
    const attachment = await this.findOne(id);

    if (attachment.userId !== user.id) {
      throw new ForbiddenException('You can only delete your own attachments');
    }

    await this.attachmentRepository.remove(attachment);
    await this.tasksService.logActivity(
      attachment.taskId,
      user.id,
      'attachment_deleted' as any,
      { from: attachment.originalName },
    );

    if (
      this.s3Client &&
      this.bucketName &&
      !attachment.url.startsWith('/uploads/')
    ) {
      try {
        await this.s3Client.send(
          new DeleteObjectCommand({
            Bucket: this.bucketName,
            Key: attachment.filename,
          }),
        );
        console.log(
          `[R2 Delete] File ${attachment.filename} deleted successfully from R2.`,
        );
      } catch (err) {
        console.error(
          `[R2 Delete] Failed to delete file ${attachment.filename} from R2:`,
          err,
        );
      }
    } else {
      const filePath = path.join(process.cwd(), 'uploads', attachment.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`[Local Delete] File deleted from disk: ${filePath}`);
      }
    }
  }
}
