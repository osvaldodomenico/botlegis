import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('admin123', 10);

  await prisma.usuario.upsert({
    where: { email: 'admin@mv2026.local' },
    update: {},
    create: {
      email: 'admin@mv2026.local',
      senha: hashedPassword,
      nome: 'Administrador MV2026',
      ativo: true,
    },
  });

  console.log('Seed completed: admin user created');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
