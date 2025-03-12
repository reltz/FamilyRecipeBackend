import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { DatabaseService } from '../services/database';
// import { StorageService } from '../services/s3Bucket';
import { LambdaService } from '../services/lambdas';
import { APIService } from '../services/api';
import { StorageService } from '../services/s3Bucket';

export class FamilyRecipeStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const database = new DatabaseService(this, "database-service");

    const storage = new StorageService(this, 'storage-service');


    const lambdas = new LambdaService(this, 'lambda-service', {
      table: database.table,
      bucket: storage.bucket,
    })

    new APIService(this, 'api-service', { loginLambda: lambdas.loginLambda, crudLambda: lambdas.crudLambda, authorizer: lambdas.authorizer });
  }
}
