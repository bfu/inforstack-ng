import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { DspGeneratorApi } from '@api/dsp/generator';
import { HasPermiDirective } from '@shared/directives/has-permi.directive';
import {
  DspColumnInfo,
  DspDataSource,
  DspGeneratedScript,
  DspInstanceInfo,
  DspMetaQuery,
  DspTableInfo,
} from '@core/models/dsp';

/**
 * 脚本生成页
 *
 * 交互链路：选择数据源 → 选择该数据源下的实例（库/模式）→ 选择实例下的数据表，
 * 系统按所选表结构生成 6 条相互独立的 CRUD 脚本（查询所有、翻页查询、批量添加、单条添加、修改、删除），
 * 脚本名称与脚本标识均给出默认值并可在页面上修改，确认后一键批量保存为脚本草稿。
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-dsp-generator-page',
  imports: [
    FormsModule,
    HasPermiDirective,
    NzAlertModule,
    NzButtonModule,
    NzCardModule,
    NzFormModule,
    NzGridModule,
    NzIconModule,
    NzInputModule,
    NzModalModule,
    NzSelectModule,
    NzTableModule,
    NzTagModule,
  ],
  templateUrl: './generator.html',
  styleUrl: './generator.less',
})
export class DspGeneratorPage implements OnInit {
  private readonly api = inject(DspGeneratorApi);
  private readonly message = inject(NzMessageService);

  /* ---------------- 数据源 / 实例 / 表 三级联动 ---------------- */
  readonly dataSources = signal<DspDataSource[]>([]);
  readonly dataSourceId = signal<number>(0);
  readonly dataSourceOptions = computed(() => [
    { value: 0, label: '默认主库' },
    ...this.dataSources().map((item) => ({
      value: item.dataSourceId as number,
      label: item.name ?? `#${item.dataSourceId}`,
    })),
  ]);

  readonly instances = signal<DspInstanceInfo[]>([]);
  readonly instanceLoading = signal(false);
  readonly instanceKey = signal<string | undefined>(undefined);
  /** 数据源未暴露实例（如单库文件型数据库）时无需选择实例 */
  readonly noInstance = signal(false);
  readonly currentInstance = computed(() =>
    this.instances().find((item) => this.instanceKeyOf(item) === this.instanceKey()),
  );
  readonly tableSelectable = computed(() => this.noInstance() || this.instanceKey() != null);

  readonly tables = signal<DspTableInfo[]>([]);
  readonly tableLoading = signal(false);
  readonly tableName = signal<string | undefined>(undefined);

  readonly columns = signal<DspColumnInfo[]>([]);
  readonly columnsLoading = signal(false);
  readonly tableComment = signal('');
  readonly databaseProduct = signal('');

  /* ---------------- 生成预览 ---------------- */
  readonly previewLoading = signal(false);
  readonly scripts = signal<DspGeneratedScript[]>([]);
  readonly generating = signal(false);

  /* ---------------- 脚本内容查看 ---------------- */
  readonly contentVisible = signal(false);
  readonly contentTitle = signal('');
  readonly contentText = signal('');

  ngOnInit(): void {
    this.api.listDataSources().subscribe({
      next: (res) => this.dataSources.set(res.data ?? []),
    });
    this.onDataSourceChange(0);
  }

  /* ---------------- 联动 ---------------- */

  onDataSourceChange(dataSourceId: number): void {
    this.dataSourceId.set(dataSourceId);
    // 切换数据源后清空下级的实例、表与预览，避免残留上一次的联动结果
    this.instances.set([]);
    this.instanceKey.set(undefined);
    this.noInstance.set(false);
    this.resetTable();
    this.instanceLoading.set(true);
    this.api.listInstances(dataSourceId).subscribe({
      next: (res) => {
        const instances = res.data ?? [];
        this.instances.set(instances);
        this.instanceLoading.set(false);
        if (instances.length === 0) {
          // 无实例维度时直接进入表选择
          this.noInstance.set(true);
          this.loadTables();
        } else if (instances.length === 1) {
          // 仅一个实例时自动选中，减少一次点击
          this.onInstanceChange(this.instanceKeyOf(instances[0]));
        }
      },
      error: () => this.instanceLoading.set(false),
    });
  }

  onInstanceChange(instanceKey: string | undefined): void {
    this.instanceKey.set(instanceKey);
    this.resetTable();
    if (instanceKey == null || !this.tableSelectable()) {
      return;
    }
    this.loadTables();
  }

  onTableSearch(keyword: string): void {
    if (!this.tableSelectable()) {
      return;
    }
    this.loadTables(keyword);
  }

  onTableChange(tableName: string | undefined): void {
    this.tableName.set(tableName);
    this.columns.set([]);
    this.scripts.set([]);
    if (!tableName) {
      return;
    }
    this.loadColumns();
    this.preview();
  }

  loadTables(keyword?: string): void {
    if (!this.tableSelectable()) {
      return;
    }
    this.tableLoading.set(true);
    this.api.listTables({ ...this.instanceQuery(), tableName: keyword }).subscribe({
      next: (res) => {
        this.tables.set(res.data ?? []);
        this.tableLoading.set(false);
      },
      error: () => this.tableLoading.set(false),
    });
  }

  loadColumns(): void {
    const tableName = this.tableName();
    if (!tableName) {
      return;
    }
    this.columnsLoading.set(true);
    this.api.listColumns({ ...this.instanceQuery(), tableName }).subscribe({
      next: (res) => {
        this.columns.set(res.data ?? []);
        this.columnsLoading.set(false);
      },
      error: () => this.columnsLoading.set(false),
    });
  }

  /** 生成预览：按表结构生成 6 条 CRUD 脚本 */
  preview(): void {
    const tableName = this.tableName();
    if (!tableName) {
      this.message.warning('请先选择数据表');
      return;
    }
    this.previewLoading.set(true);
    this.api.preview({ ...this.instanceQuery(), tableName }).subscribe({
      next: (res) => {
        const data = res.data;
        this.previewLoading.set(false);
        if (!data) {
          return;
        }
        this.tableComment.set(data.tableComment ?? '');
        this.databaseProduct.set(data.databaseProduct ?? '');
        if (data.columns?.length) {
          this.columns.set(data.columns);
        }
        // 复制一份，便于在页面上直接修改脚本名称与标识
        this.scripts.set((data.scripts ?? []).map((item) => ({ ...item })));
      },
      error: () => {
        this.previewLoading.set(false);
        this.scripts.set([]);
      },
    });
  }

  /** 批量保存为脚本草稿 */
  generate(): void {
    const scripts = this.scripts();
    if (!scripts.length) {
      this.message.warning('请先生成预览');
      return;
    }
    if (scripts.some((item) => !item.name?.trim() || !item.slug?.trim())) {
      this.message.warning('脚本名称与脚本标识不能为空');
      return;
    }
    this.generating.set(true);
    this.api
      .generate({
        dataSourceId: this.dataSourceId(),
        scripts: scripts.map((item) => ({
          action: item.action,
          actionName: item.actionName,
          name: item.name?.trim(),
          slug: item.slug?.trim(),
          description: item.description,
          content: item.content,
        })),
      })
      .subscribe({
        next: (res) => {
          this.generating.set(false);
          this.message.success(
            `已生成 ${res.data?.length ?? scripts.length} 条脚本草稿，可在「脚本管理」中编辑与发布`,
          );
          this.scripts.set([]);
        },
        error: () => this.generating.set(false),
      });
  }

  viewContent(row: DspGeneratedScript): void {
    this.contentTitle.set(`${row.actionName ?? ''} · ${row.slug ?? ''}`);
    this.contentText.set(row.content ?? '');
    this.contentVisible.set(true);
  }

  /* ---------------- 展示辅助 ---------------- */

  instanceKeyOf(instance: DspInstanceInfo): string {
    return `${instance.type ?? 'catalog'}:${instance.catalog ?? ''}:${instance.schema ?? ''}`;
  }

  instanceLabel(instance: DspInstanceInfo): string {
    const name = instance.name ?? '';
    return instance.current ? `${name}（当前）` : name;
  }

  tableLabel(table: DspTableInfo): string {
    return table.tableComment
      ? `${table.tableName}（${table.tableComment}）`
      : (table.tableName ?? '');
  }

  commandColor(commandType?: string): string {
    switch (commandType) {
      case 'INSERT':
        return 'green';
      case 'UPDATE':
        return 'orange';
      case 'DELETE':
        return 'red';
      default:
        return 'blue';
    }
  }

  private instanceQuery(): DspMetaQuery {
    const instance = this.currentInstance();
    return {
      dataSourceId: this.dataSourceId(),
      catalog: instance?.catalog || undefined,
      schema: instance?.schema || undefined,
    };
  }

  private resetTable(): void {
    this.tableName.set(undefined);
    this.tables.set([]);
    this.columns.set([]);
    this.tableComment.set('');
    this.databaseProduct.set('');
    this.scripts.set([]);
  }
}
