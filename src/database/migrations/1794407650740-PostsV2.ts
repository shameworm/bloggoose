import { MigrationInterface, QueryRunner } from 'typeorm';

export class PostsV21794407650740 implements MigrationInterface {
  name = 'PostsV21794407650740';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Hand-edited: add "body" first and copy the old text into it, so existing
    // posts keep their content and pass the CHECK below.
    await queryRunner.query(
      `ALTER TABLE "posts" ADD "body" character varying(500)`,
    );
    await queryRunner.query(`UPDATE "posts" SET "body" = LEFT("content", 500)`);

    await queryRunner.query(
      `ALTER TABLE "posts" DROP CONSTRAINT "UQ_54ddf9075260407dcfdd7248577"`,
    );
    await queryRunner.query(`ALTER TABLE "posts" DROP COLUMN "title"`);
    await queryRunner.query(`ALTER TABLE "posts" DROP COLUMN "slug"`);
    await queryRunner.query(`ALTER TABLE "posts" DROP COLUMN "content"`);
    await queryRunner.query(`ALTER TABLE "posts" DROP COLUMN "published_at"`);
    await queryRunner.query(`ALTER TABLE "posts" DROP COLUMN "updated_at"`);
    await queryRunner.query(`ALTER TABLE "posts" ADD "reply_to_id" uuid`);
    await queryRunner.query(`ALTER TABLE "posts" ADD "repost_of_id" uuid`);
    await queryRunner.query(
      `ALTER TABLE "posts" ADD "like_count" integer NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "posts" ADD "reply_count" integer NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "posts" ADD "repost_count" integer NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "posts" ADD "deleted_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_77d932fee463f3a2985034ecec" ON "posts"  ("reply_to_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ffcdd1a2f134b00248f08aef98" ON "posts"  ("created_at", "id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_329771496cd6a61a573f6df514" ON "posts"  ("author_id", "created_at", "id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "posts" ADD CONSTRAINT "CHK_fe584828f1039881b2a8452f08" CHECK ("body" IS NOT NULL OR "repost_of_id" IS NOT NULL)`,
    );
    await queryRunner.query(
      `ALTER TABLE "posts" ADD CONSTRAINT "FK_77d932fee463f3a2985034ecec3" FOREIGN KEY ("reply_to_id") REFERENCES "posts"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "posts" ADD CONSTRAINT "FK_80c1fd1d3486440b51279293381" FOREIGN KEY ("repost_of_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Hand-edited: re-add the old columns as nullable, fill them from "body",
    // then make them NOT NULL - adding NOT NULL columns to a table with rows
    // would fail.
    await queryRunner.query(
      `ALTER TABLE "posts" ADD "title" character varying`,
    );
    await queryRunner.query(`ALTER TABLE "posts" ADD "slug" character varying`);
    await queryRunner.query(`ALTER TABLE "posts" ADD "content" text`);
    await queryRunner.query(
      `ALTER TABLE "posts" ADD "published_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "posts" ADD "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `UPDATE "posts" SET "content" = COALESCE("body", ''), "title" = LEFT(COALESCE("body", 'Repost'), 200), "slug" = "id"::text, "published_at" = "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "posts" ALTER COLUMN "title" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "posts" ALTER COLUMN "slug" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "posts" ALTER COLUMN "content" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "posts" ADD CONSTRAINT "UQ_54ddf9075260407dcfdd7248577" UNIQUE ("slug")`,
    );

    await queryRunner.query(
      `ALTER TABLE "posts" DROP CONSTRAINT "FK_80c1fd1d3486440b51279293381"`,
    );
    await queryRunner.query(
      `ALTER TABLE "posts" DROP CONSTRAINT "FK_77d932fee463f3a2985034ecec3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "posts" DROP CONSTRAINT "CHK_fe584828f1039881b2a8452f08"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_329771496cd6a61a573f6df514"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ffcdd1a2f134b00248f08aef98"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_77d932fee463f3a2985034ecec"`,
    );
    await queryRunner.query(`ALTER TABLE "posts" DROP COLUMN "deleted_at"`);
    await queryRunner.query(`ALTER TABLE "posts" DROP COLUMN "repost_count"`);
    await queryRunner.query(`ALTER TABLE "posts" DROP COLUMN "reply_count"`);
    await queryRunner.query(`ALTER TABLE "posts" DROP COLUMN "like_count"`);
    await queryRunner.query(`ALTER TABLE "posts" DROP COLUMN "repost_of_id"`);
    await queryRunner.query(`ALTER TABLE "posts" DROP COLUMN "reply_to_id"`);
    await queryRunner.query(`ALTER TABLE "posts" DROP COLUMN "body"`);
  }
}
