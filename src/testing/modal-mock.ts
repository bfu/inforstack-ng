import { DebugElement } from '@angular/core';
import { Subject } from 'rxjs';
import { vi } from 'vitest';
import { NzModalService } from 'ng-zorro-antd/modal';

export type Mock = ReturnType<typeof vi.fn>;

/** confirm 弹窗配置中与测试相关的字段 */
export interface ModalConfirmConfig {
  nzTitle?: string;
  nzContent?: string;
  nzOnOk?: () => void;
  nzOnCancel?: () => void;
}

/** create 弹窗配置中与测试相关的字段（如重置密码） */
export interface ModalCreateConfig {
  nzTitle?: string;
  nzContent?: unknown;
  nzOnOk?: () => unknown;
}

/** 弹窗引用桩：afterClose 用 Subject，避免打开后立即触发关闭 */
function createModalRefStub(): Record<string, unknown> {
  return {
    afterClose: new Subject<unknown>(),
    afterOpen: new Subject<unknown>(),
    close: vi.fn(),
    destroy: vi.fn(),
    triggerOk: vi.fn(),
    triggerCancel: vi.fn(),
    updateConfig: vi.fn(),
    getContentComponent: vi.fn(),
    getElement: vi.fn(),
    _finishDialogClose: vi.fn(),
  };
}

/** 确认弹窗的执行模式：直接确认、直接取消或都不执行（仅记录配置） */
export type ModalConfirmMode = 'ok' | 'cancel' | 'none';

/**
 * 将页面组件实际拿到的 NzModalService 替换为桩实现。
 *
 * NzModalService 由 NzModalModule 提供（非 providedIn: 'root'），页面 standalone 组件
 * imports 该模块后会在组件注入器中提供实例，遮蔽 TestBed 环境级 provider，因此需要取
 * 组件注入器里的实例打桩：
 * - confirm：记录最后一次配置，默认执行 nzOnOk，便于断言删除/状态切换的确认流程
 * - create：模板里的 <nz-modal> 打开时调用，返回不创建 CDK overlay 的引用桩，
 *   否则真实服务在测试中会因父级 mock 缺少 openModals 抛错
 */
export function stubModalService(host: DebugElement): {
  confirm: Mock;
  create: Mock;
  lastConfig: () => ModalConfirmConfig | undefined;
  createConfig: () => ModalCreateConfig | undefined;
  setMode: (mode: ModalConfirmMode) => void;
} {
  // 直接覆盖实例上的 confirm/create：既能遮蔽真实服务（页面 imports NzModalModule 时
  // 拿到模块提供的实例），也能补全环境级空对象（页面未导入 NzModalModule 时）
  const service = host.injector.get(NzModalService) as unknown as Record<string, unknown>;
  let lastConfig: ModalConfirmConfig | undefined;
  let mode: ModalConfirmMode = 'ok';
  const confirm = vi.fn((config: ModalConfirmConfig) => {
    lastConfig = config;
    if (mode === 'ok') {
      config.nzOnOk?.();
    } else if (mode === 'cancel') {
      config.nzOnCancel?.();
    }
  });
  let createConfig: ModalCreateConfig | undefined;
  const create = vi.fn((config: ModalCreateConfig) => {
    createConfig = config;
    return createModalRefStub();
  });
  service['confirm'] = confirm;
  service['create'] = create;
  return {
    confirm,
    create,
    lastConfig: () => lastConfig,
    createConfig: () => createConfig,
    setMode: (next: ModalConfirmMode) => {
      mode = next;
    },
  };
}
