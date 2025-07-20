import { Injectable } from '@nestjs/common';
import { HttpClient } from './http-client';
import { UserResponseDto, CreateUserDto, UpdateUserDto, LoginDto, AuthResponseDto } from '@app/common/dto/user.dto';

@Injectable()
export class UserSdkService {
  private httpClient: HttpClient;

  constructor(baseURL: string) {
    this.httpClient = new HttpClient({ baseURL });
  }

  async createUser(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    return this.httpClient.post<UserResponseDto>('/users', createUserDto);
  }

  async getUserById(id: string, headers?: any): Promise<UserResponseDto> {
    return this.httpClient.get<UserResponseDto>(`/users/${id}`, { headers });
  }

  async getUserByEmail(email: string, headers?: any): Promise<UserResponseDto> {
    return this.httpClient.get<UserResponseDto>(`/users/email/${email}`, { headers });
  }

  async updateUser(id: string, updateUserDto: UpdateUserDto): Promise<UserResponseDto> {
    return this.httpClient.patch<UserResponseDto>(`/users/${id}`, updateUserDto);
  }

  async deleteUser(id: string): Promise<void> {
    return this.httpClient.delete<void>(`/users/${id}`);
  }

  async getAllUsers(headers?: any): Promise<UserResponseDto[]> {
    return this.httpClient.get<UserResponseDto[]>('/users', { headers });
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    return this.httpClient.post<AuthResponseDto>('/auth/login', loginDto);
  }

  async validateToken(token: string): Promise<UserResponseDto> {
    return this.httpClient.get<UserResponseDto>('/auth/validate', {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async refreshToken(refreshToken: string): Promise<AuthResponseDto> {
    return this.httpClient.post<AuthResponseDto>('/auth/refresh', { refreshToken });
  }
} 