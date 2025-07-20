import { Injectable, NotFoundException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ClientProxy } from '@nestjs/microservices';
import { Inject } from '@nestjs/common';
import { User } from '../entities/user.entity';
import { CreateUserDto, UpdateUserDto, UserResponseDto, LoginDto, AuthResponseDto } from '@app/common/dto/user.dto';
import { KAFKA_TOPICS, UserCreatedEvent, UserUpdatedEvent, UserDeletedEvent } from '../../../../kafka/kafka-config';
import { StructuredLogger } from '@app/common/logging';

@Injectable()
export class UserService {
  private readonly logger = new StructuredLogger('UserService');

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    @Inject('KAFKA_SERVICE')
    private readonly kafkaClient: ClientProxy,
  ) {}

  async createUser(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    this.logger.log('Creating new user', {
      email: createUserDto.email,
      role: createUserDto.role,
    });

    const existingUser = await this.userRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      this.logger.warn('User creation failed - email already exists', {
        email: createUserDto.email,
      });
      throw new ConflictException('User with this email already exists');
    }

    const user = this.userRepository.create(createUserDto);
    const savedUser = await this.userRepository.save(user);

    // Publish user created event
    const event: UserCreatedEvent = {
      userId: savedUser.id,
      email: savedUser.email,
      firstName: savedUser.firstName,
      lastName: savedUser.lastName,
      role: savedUser.role,
      timestamp: new Date().toISOString(),
    };

    this.logger.logEvent('user.created', event);
    this.logger.log('Emitting user.created event', {
      userId: savedUser.id,
      topic: KAFKA_TOPICS.USER.CREATED,
    });

    try {
      this.kafkaClient.emit(KAFKA_TOPICS.USER.CREATED, event);
      this.logger.log('User created event emitted successfully', {
        userId: savedUser.id,
      });
    } catch (error) {
      this.logger.error('Failed to emit user.created event', error.stack, {
        userId: savedUser.id,
        error: error.message,
      });
    }

    this.logger.log('User created successfully', {
      userId: savedUser.id,
      email: savedUser.email,
    });

    return this.mapToResponseDto(savedUser);
  }

  async getUserById(id: string): Promise<UserResponseDto> {
    this.logger.log('Getting user by ID', { userId: id });

    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      this.logger.warn('User not found', { userId: id });
      throw new NotFoundException('User not found');
    }

    return this.mapToResponseDto(user);
  }

  async getUserByEmail(email: string): Promise<UserResponseDto> {
    this.logger.log('Getting user by email', { email });

    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      this.logger.warn('User not found by email', { email });
      throw new NotFoundException('User not found');
    }

    return this.mapToResponseDto(user);
  }

  async updateUser(id: string, updateUserDto: UpdateUserDto): Promise<UserResponseDto> {
    this.logger.log('Updating user', { userId: id, fields: Object.keys(updateUserDto) });

    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      this.logger.warn('User not found for update', { userId: id });
      throw new NotFoundException('User not found');
    }

    // Check if email is being updated and if it's already taken
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.userRepository.findOne({
        where: { email: updateUserDto.email },
      });
      if (existingUser) {
        this.logger.warn('User update failed - email already exists', {
          userId: id,
          email: updateUserDto.email,
        });
        throw new ConflictException('User with this email already exists');
      }
    }

    Object.assign(user, updateUserDto);
    const updatedUser = await this.userRepository.save(user);

    // Publish user updated event
    const event: UserUpdatedEvent = {
      userId: updatedUser.id,
      email: updateUserDto.email,
      firstName: updateUserDto.firstName,
      lastName: updateUserDto.lastName,
      role: updateUserDto.role,
      timestamp: new Date().toISOString(),
    };

    this.logger.logEvent('user.updated', event);
    this.kafkaClient.emit(KAFKA_TOPICS.USER.UPDATED, event);

    this.logger.log('User updated successfully', { userId: id });
    return this.mapToResponseDto(updatedUser);
  }

  async deleteUser(id: string): Promise<void> {
    this.logger.log('Deleting user', { userId: id });

    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      this.logger.warn('User not found for deletion', { userId: id });
      throw new NotFoundException('User not found');
    }

    await this.userRepository.remove(user);

    // Publish user deleted event
    const event: UserDeletedEvent = {
      userId: id,
      timestamp: new Date().toISOString(),
    };

    this.logger.logEvent('user.deleted', event);
    this.kafkaClient.emit(KAFKA_TOPICS.USER.DELETED, event);

    this.logger.log('User deleted successfully', { userId: id });
  }

  async getAllUsers(): Promise<UserResponseDto[]> {
    this.logger.log('Getting all users');
    
    const users = await this.userRepository.find();
    this.logger.log('Retrieved all users', { count: users.length });
    
    return users.map(user => this.mapToResponseDto(user));
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    this.logger.log('User login attempt', { email: loginDto.email });

    const user = await this.userRepository.findOne({
      where: { email: loginDto.email },
    });

    if (!user || !(await user.validatePassword(loginDto.password))) {
      this.logger.warn('Login failed - invalid credentials', { email: loginDto.email });
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      this.logger.warn('Login failed - user account deactivated', { userId: user.id });
      throw new UnauthorizedException('User account is deactivated');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    this.logger.log('User login successful', { userId: user.id, email: user.email });

    return {
      user: this.mapToResponseDto(user),
      accessToken,
      refreshToken,
    };
  }

  async validateToken(token: string): Promise<UserResponseDto> {
    try {
      const payload = this.jwtService.verify(token);
      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
      });

      if (!user || !user.isActive) {
        this.logger.warn('Token validation failed - user not found or inactive', {
          userId: payload.sub,
        });
        throw new UnauthorizedException('Invalid token');
      }

      this.logger.log('Token validation successful', { userId: user.id });
      return this.mapToResponseDto(user);
    } catch (error) {
      this.logger.error('Token validation failed', error.stack, {
        error: error.message,
      });
      throw new UnauthorizedException('Invalid token');
    }
  }

  async refreshToken(refreshToken: string): Promise<AuthResponseDto> {
    try {
      const payload = this.jwtService.verify(refreshToken);
      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
      });

      if (!user || !user.isActive) {
        this.logger.warn('Token refresh failed - user not found or inactive', {
          userId: payload.sub,
        });
        throw new UnauthorizedException('Invalid refresh token');
      }

      const newPayload = {
        sub: user.id,
        email: user.email,
        role: user.role,
      };

      const accessToken = this.jwtService.sign(newPayload);
      const newRefreshToken = this.jwtService.sign(newPayload, { expiresIn: '7d' });

      this.logger.log('Token refresh successful', { userId: user.id });

      return {
        user: this.mapToResponseDto(user),
        accessToken,
        refreshToken: newRefreshToken,
      };
    } catch (error) {
      this.logger.error('Token refresh failed', error.stack, {
        error: error.message,
      });
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private mapToResponseDto(user: User): UserResponseDto {
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }
} 