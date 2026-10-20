import { Global, Module } from '@nestjs/common';
import { ActivitiesService } from './activities.service';

@Global()
@Module({ providers: [ActivitiesService], exports: [ActivitiesService] })
export class ActivitiesModule {}
