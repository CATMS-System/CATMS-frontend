import { request } from './api';

export async function changePassword(currentPassword, newPassword) {
  return await request('POST', '/auth/change-password', {
    current_password: currentPassword,
    new_password: newPassword,
  });
}
