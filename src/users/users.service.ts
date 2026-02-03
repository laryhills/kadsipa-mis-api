import {
  ConflictException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserEntity } from '@/users/entities/user.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { UUID_REGEX } from '@/common/constants';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  async create(
    createUserDto: CreateUserDto,
  ): Promise<
    Pick<
      UserEntity,
      'id' | 'email' | 'full_name' | 'status' | 'created_at' | 'updated_at'
    >
  > {
    const existing = await this.userRepository.findOne({
      where: { email: createUserDto.email },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }
    const user = this.userRepository.create(createUserDto);
    const savedUser = await this.userRepository.save(user);
    return {
      id: savedUser.id,
      email: savedUser.email,
      full_name: savedUser.full_name,
      status: savedUser.status,
      created_at: savedUser.created_at,
      updated_at: savedUser.updated_at,
    };
  }

  async findAll(): Promise<UserEntity[]> {
    return await this.userRepository.find();
  }

  async findOneByEmail(email: string): Promise<UserEntity | null> {
    return await this.userRepository.findOne({ where: { email } });
  }

  async findOne(id: string): Promise<UserEntity | null> {
    if (!UUID_REGEX.test(id)) {
      throw new BadRequestException('Invalid user ID');
    }
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<Pick<UserEntity, 'id' | 'email' | 'full_name' | 'status'>> {
    if (!UUID_REGEX.test(id)) {
      throw new BadRequestException('Invalid user ID');
    }
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    await this.userRepository.update(id, updateUserDto);
    const updatedUser = await this.userRepository.findOne({ where: { id } });
    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }
    return {
      id: updatedUser.id,
      email: updatedUser.email,
      full_name: updatedUser.full_name,
      status: updatedUser.status,
    };
  }

  async updateLastLoginAt(id: string): Promise<void> {
    await this.userRepository.update(id, { last_login_at: new Date() });
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }
}
