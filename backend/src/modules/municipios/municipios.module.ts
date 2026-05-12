import { Module } from '@nestjs/common';
import { MunicipiosService } from './municipios.service';
import { MunicipiosController } from './municipios.controller';

@Module({
  providers: [MunicipiosService],
  controllers: [MunicipiosController],
  exports: [MunicipiosService],
})
export class MunicipiosModule {}
