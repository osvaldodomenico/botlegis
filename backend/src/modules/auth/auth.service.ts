import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(email: string, senha: string) {
    const user = await this.prisma.usuario.findUnique({ where: { email } });
    if (!user || !user.ativo) throw new UnauthorizedException('Credenciais inválidas');

    const valid = await bcrypt.compare(senha, user.senha);
    if (!valid) throw new UnauthorizedException('Credenciais inválidas');

    const payload = { sub: user.id.toString(), email: user.email, nome: user.nome };
    return {
      access_token: this.jwtService.sign(payload),
      user: { id: user.id.toString(), email: user.email, nome: user.nome },
    };
  }
}
