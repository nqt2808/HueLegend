import { saveBatchToSupabase, addCheckpointToSupabase } from './batchService';
import { saveProductToSupabase, ProductItem } from './productService';
import { saveCertificateToSupabase, CertificateItem } from './certificateService';
import { Batch, Checkpoint } from '../types';

// Design choice: Hang doi retry luu trong localStorage de bao toan du lieu khi mat mang hoac reload trang
const OFFLINE_QUEUE_KEY = 'huelegend_offline_queue_v1';

export interface OfflineTask {
  id: string;
  type: 'SAVE_BATCH' | 'ADD_CHECKPOINT' | 'SAVE_PRODUCT' | 'SAVE_CERTIFICATE';
  payload: any;
  txHash?: string;
  batchCode?: string;
  createdAt: number;
  retryCount: number;
}

// Lay danh sach nhiem vu dang cho tu localStorage
export const getOfflineQueueItems = (): OfflineTask[] => {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.error('Loi doc hang doi offline tu localStorage:', err);
    return [];
  }
};

// Luu danh sach nhiem vu vao localStorage
const saveOfflineQueueItems = (tasks: OfflineTask[]) => {
  try {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(tasks));
  } catch (err) {
    console.error('Loi ghi hang doi offline vao localStorage:', err);
  }
};

// Them nhiem vu vao hang doi voi co che chong ghi trung (deduplication qua txHash va batchCode)
export const enqueueOfflineTask = (
  type: OfflineTask['type'],
  payload: any,
  txHash?: string,
  batchCode?: string
): void => {
  const tasks = getOfflineQueueItems();

  // Kiem tra neu da co task trung txHash va cùng type thi khong ghi trung
  if (txHash) {
    const exists = tasks.some((t) => t.txHash === txHash && t.type === type);
    if (exists) {
      console.log('Task offline voi txHash nay da co trong hang doi:', txHash);
      return;
    }
  }

  // Kiem tra neu da co task trung batchCode va cung type (tru ADD_CHECKPOINT vi co thieu nhieu checkpoint)
  if (batchCode && type !== 'ADD_CHECKPOINT') {
    const exists = tasks.some((t) => t.batchCode === batchCode && t.type === type);
    if (exists) {
      console.log('Task offline voi batchCode nay da co trong hang doi:', batchCode);
      return;
    }
  }

  const newTask: OfflineTask = {
    id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    payload,
    txHash: txHash || payload.txHash || payload.tx_hash,
    batchCode: batchCode || payload.batchCode || payload.batch_code,
    createdAt: Date.now(),
    retryCount: 0
  };

  tasks.push(newTask);
  saveOfflineQueueItems(tasks);
  console.log('Da them nhiem vu offline vao hang doi:', newTask);
};

// Xoa 1 task khoi hang doi
export const removeOfflineTask = (taskId: string): void => {
  const tasks = getOfflineQueueItems();
  const updated = tasks.filter((t) => t.id !== taskId);
  saveOfflineQueueItems(updated);
};

// Xu ly toan bo hang doi offline (thu lai gui len Supabase)
export const processOfflineQueue = async (): Promise<{ success: number; failed: number }> => {
  const tasks = getOfflineQueueItems();
  if (tasks.length === 0) return { success: 0, failed: 0 };

  console.log(`Bat dau thu lai ${tasks.length} nhiem vu trong hang doi offline...`);
  let successCount = 0;
  let failedCount = 0;
  const remainingTasks: OfflineTask[] = [];

  for (const task of tasks) {
    let ok = false;
    try {
      if (task.type === 'SAVE_BATCH') {
        ok = await saveBatchToSupabase(task.payload as Batch);
      } else if (task.type === 'ADD_CHECKPOINT') {
        ok = await addCheckpointToSupabase(task.batchCode || task.payload.batchCode, task.payload.checkpoint as Checkpoint);
      } else if (task.type === 'SAVE_PRODUCT') {
        ok = await saveProductToSupabase(task.payload as ProductItem);
      } else if (task.type === 'SAVE_CERTIFICATE') {
        ok = await saveCertificateToSupabase(task.payload as CertificateItem);
      }
    } catch (err) {
      console.error(`Loi khi thu lai task offline [${task.id}]:`, err);
      ok = false;
    }

    if (ok) {
      successCount++;
      console.log(`Dong bo thanh cong task offline [${task.id}] len Supabase`);
    } else {
      failedCount++;
      task.retryCount = (task.retryCount || 0) + 1;
      // Giu lai task neu retry duoi 10 lan
      if (task.retryCount < 10) {
        remainingTasks.push(task);
      } else {
        console.warn(`Bo qua task offline [${task.id}] do vuot qua 10 lan retry.`);
      }
    }
  }

  saveOfflineQueueItems(remainingTasks);
  return { success: successCount, failed: failedCount };
};

// Khoi tao tu dong thu lai hang doi khi app khoi chay va khi ket noi internet tro lai
export const initOfflineQueueAutoRetry = () => {
  // Chay ngay khi khoi tao
  processOfflineQueue();

  // Dang ky event online
  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
      console.log('Ket noi Internet da khoi phục. Tu dong thu lai hang doi offline...');
      processOfflineQueue();
    });
  }
};
