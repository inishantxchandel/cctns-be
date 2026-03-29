import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTicketComments1774774986656 implements MigrationInterface {
    name = 'AddTicketComments1774774986656'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "ticket_comments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "body" text NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "ticket_id" uuid, "author_id" uuid, CONSTRAINT "PK_811ed3b81dd8df6b9a92058d89c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_ticket_comments_ticket_created" ON "ticket_comments" ("ticket_id", "createdAt") `);
        await queryRunner.query(`ALTER TABLE "ticket_comments" ADD CONSTRAINT "FK_4ee48e3e18e7c3ac35152a9fb7b" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ticket_comments" ADD CONSTRAINT "FK_580b2a4f5b78b556eb684f96dbe" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ticket_comments" DROP CONSTRAINT "FK_580b2a4f5b78b556eb684f96dbe"`);
        await queryRunner.query(`ALTER TABLE "ticket_comments" DROP CONSTRAINT "FK_4ee48e3e18e7c3ac35152a9fb7b"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ticket_comments_ticket_created"`);
        await queryRunner.query(`DROP TABLE "ticket_comments"`);
    }

}
