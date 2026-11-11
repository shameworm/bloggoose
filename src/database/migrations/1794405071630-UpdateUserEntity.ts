import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateUserEntity1794405071630 implements MigrationInterface {
    name = 'UpdateUserEntity1794405071630'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "first_name"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "last_name"`);
        await queryRunner.query(`ALTER TABLE "users" ADD "display_name" character varying`);
        await queryRunner.query(`ALTER TABLE "users" ADD "bio" character varying(160)`);
        await queryRunner.query(`ALTER TABLE "users" ADD "banner_url" character varying`);
        await queryRunner.query(`ALTER TABLE "users" ADD "followers_count" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "users" ADD "following_count" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "users" ADD "post_count" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`CREATE TYPE "public"."user_role" AS ENUM('user', 'admin')`);
        await queryRunner.query(`ALTER TABLE "users" ADD "role" "public"."user_role" NOT NULL DEFAULT 'user'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "role"`);
        await queryRunner.query(`DROP TYPE "public"."user_role"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "post_count"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "following_count"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "followers_count"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "banner_url"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "bio"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "display_name"`);
        await queryRunner.query(`ALTER TABLE "users" ADD "last_name" character varying`);
        await queryRunner.query(`ALTER TABLE "users" ADD "first_name" character varying`);
    }

}
