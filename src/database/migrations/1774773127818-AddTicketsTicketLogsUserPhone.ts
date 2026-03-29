import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTicketsTicketLogsUserPhone1774773127818 implements MigrationInterface {
    name = 'AddTicketsTicketLogsUserPhone1774773127818'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."ticket_status_enum" AS ENUM('Pending', 'In Progress', 'Forwarded', 'Resolved', 'Closed')`);
        await queryRunner.query(`CREATE TABLE "tickets" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying(500) NOT NULL, "description" text NOT NULL, "status" "public"."ticket_status_enum" NOT NULL DEFAULT 'Pending', "teamAssigned" "public"."user_role_enum" NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "created_by_id" uuid, "district_id" uuid, "police_station_id" uuid, "issue_type_id" uuid, CONSTRAINT "PK_343bc942ae261cf7a1377f48fd0" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "ticket_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "action" character varying(128) NOT NULL, "details" text, "metadata" jsonb, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "ticket_id" uuid, "actor_id" uuid, CONSTRAINT "PK_3ee6cb91179048c28b4545b160f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_ticket_logs_ticket_created" ON "ticket_logs" ("ticket_id", "createdAt") `);
        await queryRunner.query(`ALTER TABLE "users" ADD "phone" character varying(20)`);
        await queryRunner.query(`ALTER TABLE "tickets" ADD CONSTRAINT "FK_f131b2269095005a89841a11e4a" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tickets" ADD CONSTRAINT "FK_3c0deff9c729805e792c8176a04" FOREIGN KEY ("district_id") REFERENCES "districts"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tickets" ADD CONSTRAINT "FK_da6322164b5f5050aba71568272" FOREIGN KEY ("police_station_id") REFERENCES "police_stations"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tickets" ADD CONSTRAINT "FK_c261416462c385dcc8630bfdced" FOREIGN KEY ("issue_type_id") REFERENCES "issue_types"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ticket_logs" ADD CONSTRAINT "FK_a23658fb68cbe2c951df5dd7d3a" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ticket_logs" ADD CONSTRAINT "FK_5c1c15181e5c146a9a860017d66" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ticket_logs" DROP CONSTRAINT "FK_5c1c15181e5c146a9a860017d66"`);
        await queryRunner.query(`ALTER TABLE "ticket_logs" DROP CONSTRAINT "FK_a23658fb68cbe2c951df5dd7d3a"`);
        await queryRunner.query(`ALTER TABLE "tickets" DROP CONSTRAINT "FK_c261416462c385dcc8630bfdced"`);
        await queryRunner.query(`ALTER TABLE "tickets" DROP CONSTRAINT "FK_da6322164b5f5050aba71568272"`);
        await queryRunner.query(`ALTER TABLE "tickets" DROP CONSTRAINT "FK_3c0deff9c729805e792c8176a04"`);
        await queryRunner.query(`ALTER TABLE "tickets" DROP CONSTRAINT "FK_f131b2269095005a89841a11e4a"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "phone"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ticket_logs_ticket_created"`);
        await queryRunner.query(`DROP TABLE "ticket_logs"`);
        await queryRunner.query(`DROP TABLE "tickets"`);
        await queryRunner.query(`DROP TYPE "public"."ticket_status_enum"`);
    }

}
