import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateUserAndRoleEnum1774768661205 implements MigrationInterface {
    name = 'CreateUserAndRoleEnum1774768661205'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."user_role_enum" AS ENUM('SYSTEM_ADMIN', 'CCTNS_INCHARGE_DISTRICT', 'NOC_TEAM_PUNJAB_POLICE', 'DBA_TEAM_WEEXCEL', 'NOC_INCHARGE_HQ')`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying(320) NOT NULL, "password" character varying(255) NOT NULL, "role" "public"."user_role_enum" NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TYPE "public"."user_role_enum"`);
    }

}
