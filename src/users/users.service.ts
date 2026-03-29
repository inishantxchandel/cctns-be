import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  async findWithPasswordByEmail(email: string): Promise<User | null> {
    const normalized = email.toLowerCase().trim();
    return this.usersRepo
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('LOWER(user.email) = :email', { email: normalized })
      .getOne();
  }

  async findByIdWithDistrict(id: string): Promise<User | null> {
    return this.usersRepo.findOne({
      where: { id },
      relations: ['district'],
    });
  }
}
