import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  private toAuthUserResponse(user: User) {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      phone: user.phone,
      district: user.district
        ? { id: user.district.id, name: user.district.name }
        : null,
    };
  }

  async me(userId: string) {
    const user = await this.usersService.findByIdWithDistrict(userId);
    if (!user) {
      throw new UnauthorizedException();
    }
    return this.toAuthUserResponse(user);
  }

  async login(dto: LoginDto) {
    const email = dto.email.toLowerCase().trim();
    const user = await this.usersService.findWithPasswordByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const ok = await bcrypt.compare(dto.password, user.password);
    if (!ok) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const access_token = await this.jwtService.signAsync(payload);

    return {
      access_token,
      user: this.toAuthUserResponse(user),
    };
  }
}
