import { RemovalPolicy } from 'aws-cdk-lib';
import { ArnPrincipal, Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export class StorageService extends Construct {
    public readonly bucket: any;

    constructor(scope: Construct, id: string) {
        super(scope, id);

        this.bucket = new s3.Bucket(this, 'RecipeStorageBucket', {
            removalPolicy: RemovalPolicy.DESTROY, // Change to RETAIN for production
            autoDeleteObjects: true, // Deletes all objects when the bucket is deleted
        });

        // Grant public read access to objects in the /public-images folder
        this.bucket.addToResourcePolicy(new PolicyStatement({
            actions: ['s3:GetObject'],
            resources: [`${this.bucket.bucketArn}/public-images/*`], // Allow access only to files in the public-images folder
            effect: Effect.ALLOW,
            principals: [new ArnPrincipal('*')], // Allows public access
        }));
    }
}
