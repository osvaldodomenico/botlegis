import { Controller, Post, Get, Body, UseGuards, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImportacoesService } from './importacoes.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('importacoes')
export class ImportacoesController {
  constructor(private service: ImportacoesService) {}

  @Post('abas')
  @UseInterceptors(FileInterceptor('file'))
  async listarAbas(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Arquivo não enviado');
    return this.service.listarAbas(file.path, file.originalname);
  }

  @Post('processar')
  async processar(@Body() body: { filePath: string; sheetName: string; fileName: string }) {
    return this.service.processUpload(body.filePath, body.fileName, body.sheetName);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Arquivo não enviado');
    return this.service.processUpload(file.path, file.originalname);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }
}
