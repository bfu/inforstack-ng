import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzUploadFile, NzUploadXHRArgs } from 'ng-zorro-antd/upload';
import { UserApi } from '@api/system/user';
import { SysUser } from '@core/models/system';
import { RuoYiReuseStrategy } from '@core/reuse-strategy';
import { TagsViewStore } from '@store/tags-view.store';
import { UserStore } from '@store/user.store';
import { ProfilePage } from './profile';

type Mock = ReturnType<typeof vi.fn>;

describe('ProfilePage 个人中心', () => {
  let getUserProfile: Mock;
  let updateUserProfile: Mock;
  let updateUserPwd: Mock;
  let uploadAvatar: Mock;
  let success: Mock;
  let warning: Mock;
  let updateLocalUser: Mock;
  let delView: Mock;
  let clear: Mock;
  let navigateByUrl: Mock;

  const user: SysUser = {
    userId: 1,
    userName: 'ry',
    nickName: '若依',
    phonenumber: '13800000000',
    email: 'ry@163.com',
    sex: '0',
    createTime: '2026-01-01 10:00:00',
    dept: { deptId: 100, deptName: '研发部门' },
  };

  function paramMap(activeTab?: string): ReturnType<typeof convertToParamMap> {
    return convertToParamMap(activeTab ? { activeTab } : {});
  }

  beforeEach(() => {
    getUserProfile = vi.fn(() =>
      of({ code: 200, msg: '', data: user, roleGroup: '管理员', postGroup: '研发岗' }),
    );
    updateUserProfile = vi.fn(() => of({ code: 200, msg: '' }));
    updateUserPwd = vi.fn(() => of({ code: 200, msg: '' }));
    uploadAvatar = vi.fn(() => of({ code: 200, msg: '', imgUrl: '/profile/avatar/a.png' }));
    success = vi.fn();
    warning = vi.fn();
    updateLocalUser = vi.fn();
    delView = vi.fn();
    clear = vi.fn();
    navigateByUrl = vi.fn(() => Promise.resolve(true));

    TestBed.configureTestingModule({
      providers: [
        {
          provide: UserApi,
          useValue: { getUserProfile, updateUserProfile, updateUserPwd, uploadAvatar },
        },
        { provide: NzMessageService, useValue: { success, warning, error: vi.fn() } },
        { provide: Router, useValue: { url: '/user/profile', navigateByUrl } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: paramMap() } } },
        { provide: TagsViewStore, useValue: { delView, visitedViews: vi.fn(() => []) } },
        { provide: RuoYiReuseStrategy, useValue: { clear } },
        {
          provide: UserStore,
          useValue: {
            avatar: vi.fn(() => '/dev-api/profile/avatar.png'),
            nickName: vi.fn(() => '若依'),
            name: vi.fn(() => 'ry'),
            updateLocalUser,
          },
        },
      ],
    });
  });

  function create(): ProfilePage {
    const fixture = TestBed.createComponent(ProfilePage);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('进入页面拉取个人信息并回显', () => {
    const page = create();

    expect(getUserProfile).toHaveBeenCalledTimes(1);
    expect(page.user().userName).toBe('ry');
    expect(page.roleGroup()).toBe('管理员');
    expect(page.postGroup()).toBe('研发岗');
    expect(page.infoForm.getRawValue()).toEqual({
      nickName: '若依',
      phonenumber: '13800000000',
      email: 'ry@163.com',
      sex: '0',
    });
  });

  it('/user/profile/resetPwd 直达修改密码页签', () => {
    TestBed.overrideProvider(ActivatedRoute, {
      useValue: { snapshot: { paramMap: paramMap('resetPwd') } },
    });

    const page = create();

    expect(page.activeTab()).toBe(1);
  });

  it('保存基本资料成功后同步本地用户态', () => {
    const page = create();
    page.infoForm.patchValue({
      nickName: '新昵称',
      phonenumber: '13900000000',
      email: 'new@163.com',
      sex: '1',
    });

    page.submitInfo();

    expect(updateUserProfile).toHaveBeenCalledWith({
      nickName: '新昵称',
      phonenumber: '13900000000',
      email: 'new@163.com',
      sex: '1',
    });
    expect(success).toHaveBeenCalledWith('修改成功');
    expect(updateLocalUser).toHaveBeenCalledWith({ nickName: '新昵称' });
    expect(page.user().nickName).toBe('新昵称');
  });

  it('基本资料校验不通过时不提交', () => {
    const page = create();
    page.infoForm.patchValue({ nickName: '', phonenumber: '123' });

    page.submitInfo();

    expect(updateUserProfile).not.toHaveBeenCalled();
  });

  it('修改密码成功后清空表单', () => {
    const page = create();
    page.pwdForm.setValue({
      oldPassword: '123456',
      newPassword: '654321',
      confirmPassword: '654321',
    });

    page.submitPwd();

    expect(updateUserPwd).toHaveBeenCalledWith('123456', '654321');
    expect(success).toHaveBeenCalledWith('修改成功');
    expect(page.pwdForm.getRawValue()).toEqual({
      oldPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
  });

  it('新密码不足 6 位时不提交', () => {
    const page = create();
    page.pwdForm.setValue({ oldPassword: '123456', newPassword: '123', confirmPassword: '123' });

    page.submitPwd();

    expect(page.pwdForm.controls.newPassword.errors?.['password']).toBe(
      '新密码长度必须介于 6 和 20 之间',
    );
    expect(updateUserPwd).not.toHaveBeenCalled();
  });

  it('两次输入的新密码不一致时不提交', () => {
    const page = create();
    page.pwdForm.setValue({
      oldPassword: '123456',
      newPassword: '654321',
      confirmPassword: '6543210',
    });

    page.submitPwd();

    expect(warning).toHaveBeenCalledWith('两次输入的密码不一致');
    expect(updateUserPwd).not.toHaveBeenCalled();
  });

  it('头像上传成功后同步本地头像', () => {
    const page = create();
    const onSuccess = vi.fn();

    page.customAvatarRequest({
      file: new File(['a'], 'a.png', { type: 'image/png' }),
      onSuccess,
    } as unknown as NzUploadXHRArgs);

    expect(uploadAvatar).toHaveBeenCalledTimes(1);
    expect(updateLocalUser).toHaveBeenCalledWith({ avatar: '/profile/avatar/a.png' });
    expect(page.user().avatar).toBe('/profile/avatar/a.png');
    expect(onSuccess).toHaveBeenCalled();
  });

  it('头像类型不是图片时拒绝上传', () => {
    const page = create();

    const allowed = page.beforeAvatarUpload({
      name: 'a.txt',
      type: 'text/plain',
      size: 10,
    } as NzUploadFile);

    expect(allowed).toBe(false);
    expect(uploadAvatar).not.toHaveBeenCalled();
  });

  it('关闭时移除当前页签并跳转上一个页签', () => {
    const page = create();

    page.close();

    expect(delView).toHaveBeenCalledWith({
      path: '/user/profile',
      title: '个人中心',
      closable: true,
    });
    expect(clear).toHaveBeenCalledWith('/user/profile');
    expect(navigateByUrl).toHaveBeenCalledWith('/index');
  });
});
