import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserDistrictId1774775300000 implements MigrationInterface {
  name = 'AddUserDistrictId1774775300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "district_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "FK_users_district" FOREIGN KEY ("district_id") REFERENCES "districts"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "FK_users_district"`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "district_id"`);
  }
}
