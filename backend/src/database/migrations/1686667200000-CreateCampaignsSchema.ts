import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateCampaignsSchema1686667200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create campaigns table
    await queryRunner.createTable(
      new Table({
        name: 'campaigns',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
            isUnique: true,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['draft', 'scheduled', 'running', 'paused', 'completed', 'archived'],
            default: "'draft'",
          },
          {
            name: 'templateId',
            type: 'uuid',
          },
          {
            name: 'ownerId',
            type: 'uuid',
          },
          {
            name: 'approvedBy',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'startDate',
            type: 'timestamp',
          },
          {
            name: 'endDate',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'isAdaptive',
            type: 'boolean',
            default: false,
          },
          {
            name: 'launchedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'completedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'totalRecipients',
            type: 'int',
            default: 0,
          },
          {
            name: 'emailsSent',
            type: 'int',
            default: 0,
          },
          {
            name: 'emailsOpened',
            type: 'int',
            default: 0,
          },
          {
            name: 'emailsClicked',
            type: 'int',
            default: 0,
          },
          {
            name: 'formsSubmitted',
            type: 'int',
            default: 0,
          },
          {
            name: 'bouncedEmails',
            type: 'int',
            default: 0,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
        indices: [
          new TableIndex({ columnNames: ['ownerId'] }),
          new TableIndex({ columnNames: ['status'] }),
          new TableIndex({ columnNames: ['createdAt'] }),
        ],
      }),
    );

    // Create campaign_recipients table
    await queryRunner.createTable(
      new Table({
        name: 'campaign_recipients',
        columns: [
          {
            name: 'campaignId',
            type: 'uuid',
            isPrimary: true,
          },
          {
            name: 'email',
            type: 'varchar',
            length: '254',
            isPrimary: true,
          },
          {
            name: 'firstName',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'lastName',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'department',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'groupId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['pending', 'sent', 'bounced', 'unsubscribed'],
            default: "'pending'",
          },
          {
            name: 'sentAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'addedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
        indices: [
          new TableIndex({ columnNames: ['campaignId', 'email'], isUnique: true }),
          new TableIndex({ columnNames: ['campaignId', 'status'] }),
          new TableIndex({ columnNames: ['email'] }),
        ],
      }),
    );

    // Create campaign_executions table
    await queryRunner.createTable(
      new Table({
        name: 'campaign_executions',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'campaignId',
            type: 'uuid',
          },
          {
            name: 'recipientEmail',
            type: 'varchar',
            length: '254',
          },
          {
            name: 'action',
            type: 'enum',
            enum: ['email_sent', 'email_opened', 'link_clicked', 'form_submitted', 'email_bounced', 'email_blocked'],
          },
          {
            name: 'timestamp',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
        ],
        indices: [
          new TableIndex({ columnNames: ['campaignId', 'action'] }),
          new TableIndex({ columnNames: ['campaignId', 'timestamp'] }),
          new TableIndex({ columnNames: ['recipientEmail'] }),
          new TableIndex({ columnNames: ['timestamp'] }),
        ],
      }),
    );

    // Add foreign keys
    await queryRunner.createForeignKey(
      'campaigns',
      new TableForeignKey({
        columnNames: ['ownerId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'campaign_recipients',
      new TableForeignKey({
        columnNames: ['campaignId'],
        referencedTableName: 'campaigns',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'campaign_executions',
      new TableForeignKey({
        columnNames: ['campaignId'],
        referencedTableName: 'campaigns',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys
    const campaignTable = await queryRunner.getTable('campaigns');
    const campaignForeignKey = campaignTable?.foreignKeys.find((fk) => fk.columnNames[0] === 'ownerId');
    if (campaignForeignKey) {
      await queryRunner.dropForeignKey('campaigns', campaignForeignKey);
    }

    const recipientsTable = await queryRunner.getTable('campaign_recipients');
    const recipientsForeignKey = recipientsTable?.foreignKeys.find((fk) => fk.columnNames[0] === 'campaignId');
    if (recipientsForeignKey) {
      await queryRunner.dropForeignKey('campaign_recipients', recipientsForeignKey);
    }

    const executionsTable = await queryRunner.getTable('campaign_executions');
    const executionsForeignKey = executionsTable?.foreignKeys.find((fk) => fk.columnNames[0] === 'campaignId');
    if (executionsForeignKey) {
      await queryRunner.dropForeignKey('campaign_executions', executionsForeignKey);
    }

    // Drop tables
    await queryRunner.dropTable('campaign_executions', true);
    await queryRunner.dropTable('campaign_recipients', true);
    await queryRunner.dropTable('campaigns', true);
  }
}
