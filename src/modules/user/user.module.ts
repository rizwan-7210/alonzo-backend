import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersService } from './services/users.service';
import { AdminUsersController } from './controllers/admin-users.controller';
import { UsersVendorsController } from './controllers/users-vendors.controller';
import { UsersRepository } from './repositories/users.repository';
import { SharedModule } from '../../shared/shared.module';
import { User, UserSchema } from '../../shared/schemas/user.schema';

@Module({
    imports: [
        SharedModule,
        MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    ],
    controllers: [AdminUsersController, UsersVendorsController],
    providers: [UsersService, UsersRepository],
    exports: [UsersService, UsersRepository],
})
export class UserModule { }

