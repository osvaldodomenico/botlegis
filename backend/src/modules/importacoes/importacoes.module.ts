import { Module } from '@nestjs/common';
import { ImportacoesService } from './importacoes.service';
import { ImportacoesController } from './importacoes.controller';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';

@Module({
  imports: [
    MulterModule.register({
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `${unique}${path.extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        const allowed = ['.xlsx', '.xls'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowed.includes(ext)) {
          cb(null, true);
        } else {
          cb(new Error('Apenas arquivos XLSX/XLS são aceitos'), false);
        }
      },
      limits: { fileSize: 50 * 1024 * 1024 },
    }),
  ],
  providers: [ImportacoesService],
  controllers: [ImportacoesController],
})
export class ImportacoesModule {}
