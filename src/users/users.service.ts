import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { PoliceStation } from '../police-stations/entities/police-station.entity';
import { User } from './entities/user.entity';
import { ListContactDirectoryQueryDto } from './dto/list-contact-directory-query.dto';

export type ContactDirectoryRow = {
  id: string;
  name: string;
  role: User['role'];
  district: { id: string; name: string } | null;
  policeStationsAllocated: Array<{ id: string; name: string }>;
  phone: string | null;
  email: string;
};

export type PaginatedContactDirectory = {
  data: ContactDirectoryRow[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    @InjectRepository(PoliceStation)
    private readonly policeStationsRepo: Repository<PoliceStation>,
  ) {}

  async findWithPasswordByEmail(email: string): Promise<User | null> {
    const normalized = email.toLowerCase().trim();
    return this.usersRepo
      .createQueryBuilder('user')
      .addSelect('user.password')
      .leftJoinAndSelect('user.district', 'district')
      .where('LOWER(user.email) = :email', { email: normalized })
      .getOne();
  }

  async findByIdWithDistrict(id: string): Promise<User | null> {
    return this.usersRepo.findOne({
      where: { id },
      relations: ['district'],
    });
  }

  async listContactDirectory(
    query: ListContactDirectoryQueryDto,
  ): Promise<PaginatedContactDirectory> {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const qb = this.usersRepo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.district', 'district')
      .orderBy('user.email', 'ASC');

    if (query.districtId) {
      qb.andWhere('district.id = :districtId', { districtId: query.districtId });
    }

    if (query.search?.trim()) {
      const search = `%${query.search.toLowerCase().trim()}%`;
      qb.andWhere(
        '(LOWER(user.email) LIKE :search OR LOWER(COALESCE(user.phone, \'\')) LIKE :search)',
        { search },
      );
    }

    qb.skip(skip).take(limit);

    const [users, total] = await qb.getManyAndCount();

    const districtIds = Array.from(
      new Set(users.map((u) => u.district?.id).filter((id): id is string => !!id)),
    );

    const policeStationsByDistrict = new Map<string, PoliceStation[]>();
    if (districtIds.length) {
      const stations = await this.policeStationsRepo.find({
        where: { district: { id: In(districtIds) } },
        relations: ['district'],
        order: { name: 'ASC' },
      });

      for (const station of stations) {
        const districtId = station.district.id;
        const arr = policeStationsByDistrict.get(districtId) ?? [];
        arr.push(station);
        policeStationsByDistrict.set(districtId, arr);
      }
    }

    const data: ContactDirectoryRow[] = users.map((user) => {
      const districtId = user.district?.id;
      const stations = districtId
        ? (policeStationsByDistrict.get(districtId) ?? []).map((ps) => ({
            id: ps.id,
            name: ps.name,
          }))
        : [];
      return {
        id: user.id,
        name: this.getDisplayName(user.email),
        role: user.role,
        district: user.district
          ? { id: user.district.id, name: user.district.name }
          : null,
        policeStationsAllocated: stations,
        phone: user.phone,
        email: user.email,
      };
    });

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  private getDisplayName(email: string): string {
    const local = email.split('@')[0] ?? email;
    return local
      .split(/[._-]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }
}
