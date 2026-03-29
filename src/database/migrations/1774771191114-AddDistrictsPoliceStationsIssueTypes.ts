import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDistrictsPoliceStationsIssueTypes1774771191114 implements MigrationInterface {
    name = 'AddDistrictsPoliceStationsIssueTypes1774771191114'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "districts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(255) NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_6a6fd6d258022e5576afbad90b4" UNIQUE ("name"), CONSTRAINT "PK_972a72ff4e3bea5c7f43a2b98af" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "police_stations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(255) NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "district_id" uuid, CONSTRAINT "PK_8197d507287440c2ab9b220b441" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_police_station_district_name" ON "police_stations" ("district_id", "name") `);
        await queryRunner.query(`CREATE TABLE "issue_types" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(255) NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_abd8a4ee32573a51551e464de12" UNIQUE ("name"), CONSTRAINT "PK_24907560935389ac8139cee3f85" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "police_stations" ADD CONSTRAINT "FK_cff94ad53da5ff8aad3d3ec9b07" FOREIGN KEY ("district_id") REFERENCES "districts"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "police_stations" DROP CONSTRAINT "FK_cff94ad53da5ff8aad3d3ec9b07"`);
        await queryRunner.query(`DROP TABLE "issue_types"`);
        await queryRunner.query(`DROP INDEX "public"."UQ_police_station_district_name"`);
        await queryRunner.query(`DROP TABLE "police_stations"`);
        await queryRunner.query(`DROP TABLE "districts"`);
    }

}
